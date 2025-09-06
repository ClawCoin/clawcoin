document.addEventListener('DOMContentLoaded', () => {
    // Function to trim surrounding transparent pixels from a canvas
    // Based on https://gist.github.com/remy/784508 with fix for cropping one pixel too much
    function trim(c) {
        var ctx = c.getContext('2d'),
            copy = document.createElement('canvas').getContext('2d'),
            pixels = ctx.getImageData(0, 0, c.width, c.height),
            l = pixels.data.length,
            i,
            bound = {
                top: null,
                left: null,
                right: null,
                bottom: null
            },
            x, y;

        for (i = 0; i < l; i += 4) {
            if (pixels.data[i + 3] !== 0) {
                x = (i / 4) % c.width;
                y = ~~((i / 4) / c.width);

                if (bound.top === null) {
                    bound.top = y;
                }

                if (bound.left === null) {
                    bound.left = x;
                } else if (x < bound.left) {
                    bound.left = x;
                }

                if (bound.right === null) {
                    bound.right = x;
                } else if (bound.right < x) {
                    bound.right = x;
                }

                if (bound.bottom === null) {
                    bound.bottom = y;
                } else if (bound.bottom < y) {
                    bound.bottom = y;
                }
            }
        }

        // If fully transparent, return original to avoid errors
        if (bound.top === null) {
            return c;
        }

        // Fix for cropping one pixel too much
        bound.bottom += 1;
        bound.right += 1;

        var trimHeight = bound.bottom - bound.top,
            trimWidth = bound.right - bound.left,
            trimmed = ctx.getImageData(bound.left, bound.top, trimWidth, trimHeight);

        copy.canvas.width = trimWidth;
        copy.canvas.height = trimHeight;
        copy.putImageData(trimmed, 0, 0);

        return copy.canvas;
    }

    // Initialize Fabric.js canvas
    const canvas = new fabric.Canvas('canvas');
    
    // Set larger resizing handles for all objects
    fabric.Object.prototype.cornerSize = 15; // Increased by 50% from 10

    // Customize selection and control colors for better visibility
    fabric.Object.prototype.borderColor = '#333333'; // Dark gray for the resize box border
    fabric.Object.prototype.cornerColor = '#00ff00'; // Bright green fill for resize handles
    fabric.Object.prototype.cornerStrokeColor = '#333333'; // Dark gray stroke for resize handles
    fabric.Object.prototype.transparentCorners = false; // Solid handles
    fabric.Object.prototype.cornerStyle = 'rect'; // Rectangular resize handles

    // Custom render function for the rotation handles to make them larger and circular
    function renderRotationIcon(ctx, left, top, styleOverride, fabricObject) {
        var size = 21; // Increased by 50% from 14
        ctx.save();
        ctx.translate(left, top);
        ctx.fillStyle = '#ff0000'; // Pure red fill to stand out
        ctx.strokeStyle = '#333333'; // Dark gray stroke
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    // Override the top-middle rotation control (mtr)
    fabric.Object.prototype.controls.mtr = new fabric.Control({
        x: 0,
        y: -0.5,
        offsetY: -40, // Increased from -30 to move further from resize handle
        cursorStyle: 'crosshair',
        actionHandler: fabric.controlsUtils.rotationWithSnapping,
        actionName: 'rotate',
        render: renderRotationIcon,
        sizeX: 21,
        sizeY: 21,
        withConnection: true // Draws a line connecting to the object
    });

    // Add bottom-middle rotation control (mbr)
    fabric.Object.prototype.controls.mbr = new fabric.Control({
        x: 0,
        y: 0.5,
        offsetY: 40, // Increased from 30 to move further from resize handle
        cursorStyle: 'crosshair',
        actionHandler: fabric.controlsUtils.rotationWithSnapping,
        actionName: 'rotate',
        render: renderRotationIcon,
        sizeX: 21,
        sizeY: 21,
        withConnection: true // Draws a line connecting to the object
    });

    // Get DOM elements
    const imageUpload = document.getElementById('imageUpload');
    const stickerButton = document.getElementById('stickerButton');
    const stickerOverlay = document.getElementById('stickerOverlay');
    const closeOverlay = document.getElementById('closeOverlay');
    const zoomIn = document.getElementById('zoomIn');
    const zoomOut = document.getElementById('zoomOut');
    const clearCanvas = document.getElementById('clearCanvas');
    const downloadImage = document.getElementById('downloadImage');
    const deleteSticker = document.getElementById('deleteSticker');

    // Initialize zoom variables
    let zoomScale = 1;
    const maxScale = 3;
    const minScale = 0.5;
    let fitScaleX, fitScaleY;

    // Store sticker data
    const stickerInitialScales = new Map(); // Initial scaleFactor for each sticker
    const stickerRelativePositions = new Map(); // Relative x, y for each sticker

    // Update sticker relative position when moved or scaled
    const updateStickerRelativePosition = (stickerObj) => {
        if (canvas.backgroundImage) {
            const bg = canvas.backgroundImage;
            const bgScaleX = bg.scaleX;
            const bgScaleY = bg.scaleY;
            const bgLeft = bg.left;
            const bgTop = bg.top;

            // Convert sticker's absolute position to relative position
            const relativeX = (stickerObj.left - bgLeft) / bgScaleX;
            const relativeY = (stickerObj.top - bgTop) / bgScaleY;
            stickerRelativePositions.set(stickerObj, { x: relativeX, y: relativeY });
        }
    };

    // Set canvas size and update object positions
    const canvasScreen = document.querySelector('.canvas-screen');
    const resizeCanvas = () => {
        const rect = canvasScreen.getBoundingClientRect();
        canvas.setDimensions({ width: rect.width, height: rect.height });
        if (canvas.backgroundImage) {
            const bg = canvas.backgroundImage;
            const imgRatio = bg.width / bg.height;
            const canvasRatio = canvas.width / canvas.height;
            if (imgRatio > canvasRatio) {
                fitScaleX = canvas.width / bg.width;
                fitScaleY = fitScaleX;
            } else {
                fitScaleY = canvas.height / bg.height;
                fitScaleX = fitScaleY;
            }
            bg.set({
                scaleX: fitScaleX * zoomScale,
                scaleY: fitScaleY * zoomScale,
                left: canvas.width / 2,
                top: canvas.height / 2
            });
            // Update sticker scales and positions
            canvas.getObjects().forEach(obj => {
                const initialScale = stickerInitialScales.get(obj);
                const relativePos = stickerRelativePositions.get(obj);
                if (initialScale && relativePos) {
                    obj.set({
                        scaleX: initialScale * zoomScale,
                        scaleY: initialScale * zoomScale,
                        left: bg.left + relativePos.x * bg.scaleX,
                        top: bg.top + relativePos.y * bg.scaleY
                    });
                }
            });
            canvas.renderAll();
        }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Load and set background image
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                fabric.Image.fromURL(event.target.result, (img) => {
                    const imgRatio = img.width / img.height;
                    const canvasRatio = canvas.width / canvas.height;
                    if (imgRatio > canvasRatio) {
                        fitScaleX = canvas.width / img.width;
                        fitScaleY = fitScaleX;
                    } else {
                        fitScaleY = canvas.height / img.height;
                        fitScaleX = fitScaleY;
                    }
                    img.set({
                        scaleX: fitScaleX * zoomScale,
                        scaleY: fitScaleY * zoomScale,
                        left: canvas.width / 2,
                        top: canvas.height / 2,
                        originX: 'center',
                        originY: 'center'
                    });
                    canvas.setBackgroundImage(img, () => {
                        // Update existing stickers' relative positions
                        canvas.getObjects().forEach(obj => {
                            updateStickerRelativePosition(obj);
                        });
                        canvas.renderAll();
                    });
                });
            };
            reader.readAsDataURL(file);
        }
    });

    // Sticker overlay toggle
    stickerButton.addEventListener('click', () => {
        stickerOverlay.style.display = 'flex';
    });

    // Close overlay
    closeOverlay.addEventListener('click', () => {
        stickerOverlay.style.display = 'none';
    });

    // Close overlay when clicking outside .sticker-container
    stickerOverlay.addEventListener('click', (e) => {
        if (e.target === stickerOverlay) {
            stickerOverlay.style.display = 'none';
        }
    });

    // Add stickers
    document.querySelectorAll('.canvas-sticker-grid img').forEach(stickerImg => {
        stickerImg.addEventListener('click', (e) => {
            if (canvas.backgroundImage) {
                const stickerSrc = `stickers/${e.target.dataset.sticker}`;
                
                // Load image and trim transparent borders
                const img = new Image();
                img.src = stickerSrc;
                img.onload = () => {
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = img.width;
                    tempCanvas.height = img.height;
                    const ctx = tempCanvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    const trimmedCanvas = trim(tempCanvas);
                    const trimmedSrc = trimmedCanvas.toDataURL();
                    
                    fabric.Image.fromURL(trimmedSrc, (stickerObj) => {
                        const scaleFactor = 250 / stickerObj.width; // Initial sticker size (now based on trimmed width)
                        stickerInitialScales.set(stickerObj, scaleFactor);
                        stickerObj.set({
                            left: canvas.width / 2,
                            top: canvas.height / 2,
                            originX: 'center',
                            originY: 'center',
                            scaleX: scaleFactor * zoomScale,
                            scaleY: scaleFactor * zoomScale,
                            selectable: true,
                            hasControls: true,
                            hasBorders: true
                        });
                        canvas.add(stickerObj);
                        canvas.setActiveObject(stickerObj);
                        updateStickerRelativePosition(stickerObj); // Set initial relative position
                        canvas.renderAll();
                        stickerOverlay.style.display = 'none';
                    });
                };
            } else {
                alert('Please upload an image first.');
            }
        });
    });

    // Handle sticker movement and scaling
    canvas.on('object:moving', (e) => {
        updateStickerRelativePosition(e.target);
    });
    canvas.on('object:scaling', (e) => {
        const stickerObj = e.target;
        const initialScale = stickerInitialScales.get(stickerObj);
        if (initialScale) {
            // Calculate the new scale factor based on the average of scaleX and scaleY, adjusted for zoom
            const newScaleFactor = (stickerObj.scaleX / zoomScale + stickerObj.scaleY / zoomScale) / 2;
            stickerInitialScales.set(stickerObj, newScaleFactor);
            updateStickerRelativePosition(stickerObj);
        }
    });

    // Delete selected sticker (shared logic for button and keyboard)
    const deleteSelectedSticker = () => {
        const activeObject = canvas.getActiveObject();
        if (activeObject && activeObject.type === 'image') { // Ensure it's a sticker (image)
            canvas.remove(activeObject);
            stickerInitialScales.delete(activeObject);
            stickerRelativePositions.delete(activeObject);
            canvas.discardActiveObject();
            canvas.renderAll();
        } else {
            alert('Please select a sticker to delete.');
        }
    };

    // Delete sticker via button
    deleteSticker.addEventListener('click', () => {
        deleteSelectedSticker();
    });

    // Delete sticker via keyboard Delete or Backspace key
    document.addEventListener('keydown', (e) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
            e.preventDefault(); // Prevent browser default actions
            deleteSelectedSticker();
        }
    });

    // Zoom controls
    zoomIn.addEventListener('click', () => {
        if (zoomScale < maxScale) {
            zoomScale = Math.min(maxScale, zoomScale + 0.1); // Increment zoomScale, cap at maxScale
            const bg = canvas.backgroundImage;
            if (bg) {
                bg.set({
                    scaleX: fitScaleX * zoomScale,
                    scaleY: fitScaleY * zoomScale,
                    left: canvas.width / 2,
                    top: canvas.height / 2
                });
                // Update sticker scales and positions
                canvas.getObjects().forEach(obj => {
                    const initialScale = stickerInitialScales.get(obj);
                    const relativePos = stickerRelativePositions.get(obj);
                    if (initialScale && relativePos) {
                        obj.set({
                            scaleX: initialScale * zoomScale,
                            scaleY: initialScale * zoomScale,
                            left: bg.left + relativePos.x * bg.scaleX,
                            top: bg.top + relativePos.y * bg.scaleY
                        });
                    }
                });
                canvas.renderAll();
            }
        }
    });

    zoomOut.addEventListener('click', () => {
        if (zoomScale > minScale) {
            zoomScale = Math.max(minScale, zoomScale - 0.1); // Decrement zoomScale, cap at minScale
            const bg = canvas.backgroundImage;
            if (bg) {
                bg.set({
                    scaleX: fitScaleX * zoomScale,
                    scaleY: fitScaleY * zoomScale,
                    left: canvas.width / 2,
                    top: canvas.height / 2
                });
                // Update sticker scales and positions
                canvas.getObjects().forEach(obj => {
                    const initialScale = stickerInitialScales.get(obj);
                    const relativePos = stickerRelativePositions.get(obj);
                    if (initialScale && relativePos) {
                        obj.set({
                            scaleX: initialScale * zoomScale,
                            scaleY: initialScale * zoomScale,
                            left: bg.left + relativePos.x * bg.scaleX,
                            top: bg.top + relativePos.y * bg.scaleY
                        });
                    }
                });
                canvas.renderAll();
            }
        }
    });

    // Clear canvas
    clearCanvas.addEventListener('click', () => {
        canvas.clear();
        zoomScale = 1;
        stickerInitialScales.clear();
        stickerRelativePositions.clear();
        imageUpload.value = '';
        canvas.renderAll();
    });

    // Download image
    downloadImage.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'edited-image.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
});
