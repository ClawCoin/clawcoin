document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const imageUpload = document.getElementById('imageUpload');
    const stickerButton = document.getElementById('stickerButton');
    const stickerOverlay = document.getElementById('stickerOverlay');
    const closeOverlay = document.getElementById('closeOverlay');
    const zoomIn = document.getElementById('zoomIn');
    const zoomOut = document.getElementById('zoomOut');
    const clearCanvas = document.getElementById('clearCanvas');
    const downloadImage = document.getElementById('downloadImage');

    let baseImage = null;
    let stickers = [];
    let scale = 1;
    const maxScale = 3;
    const minScale = 0.5;
    const canvasWidth = 600;
    const canvasHeight = 400;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    baseImage = img;
                    drawCanvas();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    stickerButton.addEventListener('click', () => {
        stickerOverlay.style.display = 'flex';
    });

    closeOverlay.addEventListener('click', () => {
        stickerOverlay.style.display = 'none';
    });

    document.querySelectorAll('.canvas-sticker-grid img').forEach(stickerImg => {
        stickerImg.addEventListener('click', (e) => {
            if (baseImage) {
                const stickerSrc = e.target.dataset.sticker;
                const sticker = new Image();
                sticker.src = `stickers/${stickerSrc}`;
                sticker.onload = () => {
                    stickers.push({ img: sticker, x: canvasWidth / 2 / scale, y: canvasHeight / 2 / scale, width: 50, height: 50 });
                    drawCanvas();
                    stickerOverlay.style.display = 'none';
                };
            }
        });
    });

    zoomIn.addEventListener('click', () => {
        if (scale < maxScale) {
            scale += 0.1;
            drawCanvas();
        }
    });

    zoomOut.addEventListener('click', () => {
        if (scale > minScale) {
            scale -= 0.1;
            drawCanvas();
        }
    });

    clearCanvas.addEventListener('click', () => {
        baseImage = null;
        stickers = [];
        scale = 1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        imageUpload.value = '';
    });

    downloadImage.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'edited-image.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });

    function drawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        ctx.scale(scale, scale);
        if (baseImage) {
            const imgRatio = baseImage.width / baseImage.height;
            const canvasRatio = canvasWidth / canvasHeight;
            let drawWidth, drawHeight;
            if (imgRatio > canvasRatio) {
                drawWidth = canvasWidth;
                drawHeight = canvasWidth / imgRatio;
            } else {
                drawHeight = canvasHeight;
                drawWidth = canvasHeight * imgRatio;
            }
            ctx.drawImage(baseImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        }
        stickers.forEach(sticker => {
            ctx.drawImage(sticker.img, sticker.x - sticker.width / 2, sticker.y - sticker.height / 2, sticker.width, sticker.height);
        });
        ctx.restore();
    }
});