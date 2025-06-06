document.addEventListener('DOMContentLoaded', () => {
    // Initialize Fabric.js canvas
    const canvas = new fabric.Canvas('canvas');
    const imageUpload = document.getElementById('imageUpload');
    const stickerButton = document.getElementById('stickerButton');
    const stickerOverlay = document.getElementById('stickerOverlay');
    const closeOverlay = document.getElementById('closeOverlay');
    const zoomIn = document.getElementById('zoomIn');
    const zoomOut = document.getElementById('zoomOut');
    const clearCanvas = document.getElementById('clearCanvas');
    const downloadImage = document.getElementById('downloadImage');

    let zoomScale = 1;
    const maxScale = 3;
    const minScale = 0.5;
    let fitScaleX, fitScaleY;

    // Set canvas size based on .canvas-screen dimensions
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
                    canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
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
                    const scaleFactor = 250 / stickerObj.width;
                    stickerObj.set({
                        left: canvas.width / 2,
                        top: canvas.height / 2,
                        originX: 'center',
                        originY: 'center',
                        scaleX: scaleFactor,
                        scaleY: scaleFactor,
                        selectable: true,
                        hasControls: true,
                        hasBorders: true
                    });
                    canvas.add(stickerObj);
                    canvas.setActiveObject(stickerObj);
                    canvas.renderAll();
                    stickerOverlay.style.display = 'none';
                });
            } else {
                alert('Please upload an image first.');
            }
        });
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
                canvas.renderAll();
            }
        }
    });

    // Clear canvas
    clearCanvas.addEventListener('click', () => {
        canvas.clear();
        zoomScale = 1;
        imageUpload.value = '';
    });

    // Download image
    downloadImage.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'edited-image.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
});
