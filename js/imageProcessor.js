(function () {
    'use strict';

    function loadImage(file) {
        return new Promise(function (resolve, reject) {
            var image = new Image();
            var objectUrl = URL.createObjectURL(file);

            image.onload = function () {
                resolve({
                    image: image,
                    objectUrl: objectUrl,
                    width: image.naturalWidth,
                    height: image.naturalHeight
                });
            };

            image.onerror = function () {
                URL.revokeObjectURL(objectUrl);
                reject(new Error('Não foi possível ler a imagem selecionada.'));
            };

            image.src = objectUrl;
        });
    }

    function validateImage(image, template) {
        return image.naturalWidth === template.width && image.naturalHeight === template.height;
    }

    function resizeImage(image, width, height) {
        var canvas = document.createElement('canvas');
        var context;

        canvas.width = width;
        canvas.height = height;
        context = canvas.getContext('2d', { willReadFrequently: true });
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(image, 0, 0, width, height);
        return canvas;
    }

    function scaleTemplate(template, scale) {
        var scaledWidth;
        var scaledHeight;
        var scaledRegions = {};

        if (!Number.isFinite(scale) || scale <= 0 || scale > 1) {
            throw new Error('A escala selecionada é inválida.');
        }

        scaledWidth = Math.round(template.width * scale);
        scaledHeight = Math.round(template.height * scale);

        Object.entries(template.regions).forEach(function (entry) {
            var key = entry[0];
            var region = entry[1];
            var x1 = Math.round(region.x * scale);
            var y1 = Math.round(region.y * scale);
            var x2 = Math.round((region.x + region.width) * scale);
            var y2 = Math.round((region.y + region.height) * scale);

            scaledRegions[key] = {
                label: region.label,
                x: x1,
                y: y1,
                width: x2 - x1,
                height: y2 - y1
            };
        });

        return {
            name: template.name,
            width: scaledWidth,
            height: scaledHeight,
            scale: scale,
            regions: scaledRegions
        };
    }

    function validateRegions(template) {
        var entries = Object.entries(template.regions);

        entries.forEach(function (entry) {
            var key = entry[0];
            var region = entry[1];
            var values = [region.x, region.y, region.width, region.height];

            if (!values.every(Number.isInteger) || region.width <= 0 || region.height <= 0) {
                throw new Error('A região "' + key + '" possui coordenadas inválidas.');
            }

            if (region.x < 0 || region.y < 0 ||
                region.x + region.width > template.width ||
                region.y + region.height > template.height) {
                throw new Error('A região "' + key + '" ultrapassa os limites do modelo.');
            }
        });

        entries.forEach(function (entry, index) {
            var firstKey = entry[0];
            var first = entry[1];

            entries.slice(index + 1).forEach(function (otherEntry) {
                var secondKey = otherEntry[0];
                var second = otherEntry[1];
                var overlaps = first.x < second.x + second.width &&
                    first.x + first.width > second.x &&
                    first.y < second.y + second.height &&
                    first.y + first.height > second.y;

                if (overlaps) {
                    throw new Error('As regiões "' + firstKey + '" e "' + secondKey + '" se sobrepõem.');
                }
            });
        });
    }

    function cropImage(image, region) {
        var canvas = document.createElement('canvas');
        var context;

        canvas.width = region.width;
        canvas.height = region.height;
        context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(
            image,
            region.x,
            region.y,
            region.width,
            region.height,
            0,
            0,
            region.width,
            region.height
        );

        return new Promise(function (resolve, reject) {
            canvas.toBlob(function (blob) {
                if (!blob) {
                    reject(new Error('Não foi possível criar um dos recortes da imagem.'));
                    return;
                }
                resolve(blob);
            }, 'image/png');
        });
    }

    function uniqueSorted(values) {
        return Array.from(new Set(values)).sort(function (first, second) {
            return first - second;
        });
    }

    function findRegionForCell(x, y, width, height, regions) {
        var match = Object.entries(regions).find(function (entry) {
            var region = entry[1];
            return x >= region.x && y >= region.y &&
                x + width <= region.x + region.width &&
                y + height <= region.y + region.height;
        });

        return match ? match[0] : null;
    }

    async function createSlicedAssets(image, template) {
        var xLines = [0, template.width];
        var yLines = [0, template.height];
        var assets = [];
        var rowIndex;
        var columnIndex;

        validateRegions(template);

        Object.values(template.regions).forEach(function (region) {
            xLines.push(region.x, region.x + region.width);
            yLines.push(region.y, region.y + region.height);
        });

        xLines = uniqueSorted(xLines);
        yLines = uniqueSorted(yLines);

        for (rowIndex = 0; rowIndex < yLines.length - 1; rowIndex += 1) {
            for (columnIndex = 0; columnIndex < xLines.length - 1; columnIndex += 1) {
                var x = xLines[columnIndex];
                var y = yLines[rowIndex];
                var width = xLines[columnIndex + 1] - x;
                var height = yLines[rowIndex + 1] - y;
                var regionKey = findRegionForCell(x, y, width, height, template.regions);
                var name = 'slice-r' + String(rowIndex + 1).padStart(2, '0') +
                    '-c' + String(columnIndex + 1).padStart(2, '0') +
                    (regionKey ? '-' + regionKey : '') + '.png';

                assets.push({
                    name: name,
                    blob: await cropImage(image, { x: x, y: y, width: width, height: height }),
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    row: rowIndex,
                    column: columnIndex,
                    regionKey: regionKey
                });
            }
        }

        return assets;
    }

    function loadBlobImage(blob) {
        return new Promise(function (resolve, reject) {
            var image = new Image();
            var url = URL.createObjectURL(blob);

            image.onload = function () {
                URL.revokeObjectURL(url);
                resolve(image);
            };
            image.onerror = function () {
                URL.revokeObjectURL(url);
                reject(new Error('Não foi possível conferir um dos recortes.'));
            };
            image.src = url;
        });
    }

    async function verifyReconstruction(sourceImage, assets, template) {
        var originalCanvas = document.createElement('canvas');
        var rebuiltCanvas = document.createElement('canvas');
        var originalContext;
        var rebuiltContext;
        var originalPixels;
        var rebuiltPixels;
        var images;
        var index;

        originalCanvas.width = rebuiltCanvas.width = template.width;
        originalCanvas.height = rebuiltCanvas.height = template.height;
        originalContext = originalCanvas.getContext('2d', { willReadFrequently: true });
        rebuiltContext = rebuiltCanvas.getContext('2d', { willReadFrequently: true });
        originalContext.drawImage(sourceImage, 0, 0);

        images = await Promise.all(assets.map(function (asset) {
            return loadBlobImage(asset.blob);
        }));

        assets.forEach(function (asset, assetIndex) {
            rebuiltContext.drawImage(images[assetIndex], asset.x, asset.y, asset.width, asset.height);
        });

        originalPixels = originalContext.getImageData(0, 0, template.width, template.height).data;
        rebuiltPixels = rebuiltContext.getImageData(0, 0, template.width, template.height).data;

        for (index = 0; index < originalPixels.length; index += 1) {
            if (originalPixels[index] !== rebuiltPixels[index]) {
                return false;
            }
        }

        return rebuiltCanvas.width === template.width && rebuiltCanvas.height === template.height;
    }

    window.SignatureImageProcessor = {
        loadImage: loadImage,
        validateImage: validateImage,
        resizeImage: resizeImage,
        scaleTemplate: scaleTemplate,
        cropImage: cropImage,
        createSlicedAssets: createSlicedAssets,
        verifyReconstruction: verifyReconstruction
    };
}());
