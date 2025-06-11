document.addEventListener('DOMContentLoaded', () => {
    // Initialize Fabric.js canvas
    const canvas = new fabric.Canvas('canvas');
    
    // Set smaller resizing handles for all objects
    fabric.Object.prototype.cornerSize = 10; // Reduced from default ~13

    // Get DOM elements
    const imageUpload = document.getElementById('imageUpload');
    const stickerButton = document.getElementById('stickerButton');
    const stickerOverlay = document.getElementById('stickerOverlay');
    const closeOverlay = document.getElementById('closeOverlay');
    const zoomIn = document.getElementById('zoomIn');
    const zoomOut = document.getElementById('zoomOut');
    const clearCanvas = document.getElementById('clearCanvas');
    const downloadImage = document.getElementById('downloadImage');

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

    // Add stickers
    document.querySelectorAll('.canvas-sticker-grid img').forEach(stickerImg => {
        stickerImg.addEventListener('click', (e) => {
            if (canvas.backgroundImage) {
                const stickerSrc = e.target.dataset.sticker;
                fabric.Image.fromURL(`stickers/${stickerSrc}`, (stickerObj) => {
                    const scaleFactor = 250 / stickerObj.width; // Initial sticker size
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
        // Store separate scale factors for X and Y, adjusted for zoom
        const newScaleX = stickerObj.scaleX / zoomScale;
        const newScaleY = stickerObj.scaleY / zoomScale;
        stickerInitialScales.set(stickerObj, { scaleX: newScaleX, scaleY: newScaleY });
        // No need to set scaleX/scaleY here; Fabric.js handles it during scaling
        updateStickerRelativePosition(stickerObj);
    }
    });

    // Zoom controls
    zoomIn.addEventListener('click', () => {
        if (zoomScale < maxScale) {
            zoomScale += 0.1;
            const bg = canvas.backgroundImage;
            if (bg) {
                bg.set({
                    scaleX: fitScaleX * zoomScale,
                    scaleY: fitScaleY * zoomScale
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
            zoomScale -= 0.1;
            const bg = canvas.backgroundImage;
            if (bg) {
                bg.set({
                    scaleX: fitScaleX * zoomScale,
                    scaleY: fitScaleY * zoomScale
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
