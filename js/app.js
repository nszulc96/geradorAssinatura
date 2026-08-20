(function () {
    'use strict';

    var templates = window.SIGNATURE_TEMPLATES;
    var sizes = window.SIGNATURE_SIZES;
    var utils = window.SignatureUtils;
    var imageProcessor = window.SignatureImageProcessor;
    var signatureGenerator = window.SignatureGenerator;
    var zipGenerator = window.SignatureZipGenerator;
    var form = document.getElementById('signature-form');
    var templateSelect = document.getElementById('template-select');
    var templateDimensions = document.getElementById('template-dimensions');
    var sizeSelect = document.getElementById('size-select');
    var sizeDimensions = document.getElementById('size-dimensions');
    var imageInput = document.getElementById('image-input');
    var fileMeta = document.getElementById('file-meta');
    var imageValidation = document.getElementById('image-validation');
    var sourcePreview = document.getElementById('source-preview');
    var sourceImage = document.getElementById('source-image');
    var regionsOverlay = document.getElementById('regions-overlay');
    var showRegions = document.getElementById('show-regions');
    var signaturePreview = document.getElementById('signature-preview');
    var integrityBadge = document.getElementById('integrity-badge');
    var appMessage = document.getElementById('app-message');
    var previewButton = document.getElementById('preview-button');
    var clearButton = document.getElementById('clear-button');
    var generateButton = document.getElementById('generate-button');
    var generateAllButton = document.getElementById('generate-all-button');
    var state = {
        loadedImage: null,
        imageObjectUrl: '',
        imageIsValid: false,
        assets: null,
        assetTemplateKey: '',
        previewUrls: [],
        resizeObserver: null
    };

    function getTemplate() {
        return templates[templateSelect.value];
    }

    function getSize() {
        return sizes[sizeSelect.value];
    }

    function getOutputTemplate() {
        return imageProcessor.scaleTemplate(getTemplate(), getSize().scale);
    }

    function setMessage(element, message, type) {
        element.className = element === appMessage ? 'app-message' : 'validation-message';
        element.textContent = message || '';
        if (message) {
            element.classList.add('is-' + type);
        }
    }

    function populateTemplates() {
        var savedTemplate = localStorage.getItem('signatureGeneratorTemplate');
        var keys = Object.keys(templates);

        keys.forEach(function (key) {
            var option = document.createElement('option');
            option.value = key;
            option.textContent = templates[key].name;
            templateSelect.appendChild(option);
        });

        templateSelect.value = templates[savedTemplate] ? savedTemplate : keys[0];
        updateTemplateDescription();
        populateSizes();
    }

    function updateTemplateDescription() {
        var template = getTemplate();
        templateDimensions.textContent = 'Imagem de entrada: ' + template.width + ' × ' + template.height + ' px';
    }

    function populateSizes() {
        var selectedSize = sizes[sizeSelect.value] ? sizeSelect.value : 'original';
        var template = getTemplate();

        sizeSelect.innerHTML = '';
        Object.keys(sizes).forEach(function (key) {
            var size = sizes[key];
            var width = Math.round(template.width * size.scale);
            var height = Math.round(template.height * size.scale);
            var option = document.createElement('option');
            option.value = key;
            option.textContent = size.label + ' — ' + width + ' × ' + height + ' px';
            sizeSelect.appendChild(option);
        });

        sizeSelect.value = selectedSize;
        updateSizeDescription();
    }

    function updateSizeDescription() {
        var outputTemplate = getOutputTemplate();
        sizeDimensions.textContent = 'Tamanho final no Outlook: ' + outputTemplate.width + ' × ' + outputTemplate.height + ' px';
    }

    function clearPreviewUrls() {
        state.previewUrls.forEach(function (url) {
            URL.revokeObjectURL(url);
        });
        state.previewUrls = [];
    }

    function invalidateAssets() {
        state.assets = null;
        state.assetTemplateKey = '';
        clearPreviewUrls();
        integrityBadge.classList.add('is-hidden');
    }

    function renderRegionOverlay() {
        var template = getTemplate();
        regionsOverlay.innerHTML = '';

        Object.values(template.regions).forEach(function (region) {
            var box = document.createElement('span');
            box.className = 'region-box';
            box.textContent = region.label;
            box.style.left = (region.x / template.width * 100) + '%';
            box.style.top = (region.y / template.height * 100) + '%';
            box.style.width = (region.width / template.width * 100) + '%';
            box.style.height = (region.height / template.height * 100) + '%';
            regionsOverlay.appendChild(box);
        });

        regionsOverlay.classList.toggle('is-visible', showRegions.checked);
    }

    function validateLoadedImage() {
        var template = getTemplate();

        if (!state.loadedImage) {
            state.imageIsValid = false;
            setMessage(imageValidation, '', '');
            return false;
        }

        state.imageIsValid = imageProcessor.validateImage(state.loadedImage, template);
        if (state.imageIsValid) {
            setMessage(imageValidation, '✓ Imagem compatível com o modelo selecionado.', 'success');
        } else {
            setMessage(
                imageValidation,
                '⚠ A imagem possui ' + state.loadedImage.naturalWidth + '×' + state.loadedImage.naturalHeight +
                    ' px. O modelo selecionado espera uma imagem ' + template.width + '×' + template.height + ' px.',
                'warning'
            );
        }

        return state.imageIsValid;
    }

    async function handleImageSelection() {
        var file = imageInput.files && imageInput.files[0];
        var loaded;

        setMessage(appMessage, '', '');
        invalidateAssets();

        if (!file) {
            resetImageState();
            return;
        }

        if (file.type !== 'image/png' && !/\.png$/i.test(file.name)) {
            resetImageState();
            setMessage(imageValidation, 'Selecione uma imagem PNG.', 'error');
            return;
        }

        try {
            if (state.imageObjectUrl) {
                URL.revokeObjectURL(state.imageObjectUrl);
            }
            loaded = await imageProcessor.loadImage(file);
            state.loadedImage = loaded.image;
            state.imageObjectUrl = loaded.objectUrl;
            sourceImage.src = loaded.objectUrl;
            sourcePreview.classList.remove('is-hidden');
            fileMeta.textContent = file.name + ' · ' + loaded.width + ' × ' + loaded.height + ' px';
            validateLoadedImage();
            renderRegionOverlay();

            if (state.imageIsValid) {
                await updatePreview(false);
            } else {
                renderEmptyPreview('A imagem não corresponde às dimensões do modelo selecionado.');
            }
        } catch (error) {
            resetImageState();
            setMessage(imageValidation, error.message, 'error');
        }
    }

    function resetImageState() {
        if (state.imageObjectUrl) {
            URL.revokeObjectURL(state.imageObjectUrl);
        }
        state.loadedImage = null;
        state.imageObjectUrl = '';
        state.imageIsValid = false;
        imageInput.value = '';
        sourceImage.removeAttribute('src');
        sourcePreview.classList.add('is-hidden');
        regionsOverlay.innerHTML = '';
        fileMeta.textContent = 'Nenhum arquivo selecionado.';
        invalidateAssets();
        renderEmptyPreview('Selecione uma imagem PNG compatível para começar.');
    }

    function getFormLinks() {
        var phone = document.getElementById('phone').value;
        var whatsapp = document.getElementById('whatsapp').value;
        var email = document.getElementById('email').value;
        var website = document.getElementById('website').value;

        if (!phone.trim()) {
            throw new Error('Informe pelo menos um telefone válido.');
        }
        if (!whatsapp.trim()) {
            throw new Error('Informe o WhatsApp.');
        }
        if (!email.trim()) {
            throw new Error('Informe o e-mail.');
        }
        if (!website.trim()) {
            throw new Error('Informe o site.');
        }

        return {
            phone: utils.normalizePhone(phone),
            whatsapp: utils.normalizeWhatsApp(whatsapp),
            email: utils.normalizeEmail(email),
            instagram: utils.normalizeInstagram(document.getElementById('instagram').value),
            linkedin: utils.normalizeLinkedIn(document.getElementById('linkedin').value),
            website: utils.normalizeUrl(website)
        };
    }

    function getPreviewLinks() {
        try {
            return getFormLinks();
        } catch (error) {
            return {
                phone: '',
                email: '',
                whatsapp: '',
                instagram: '',
                linkedin: '',
                website: ''
            };
        }
    }

    async function createAssetsForOutputTemplate(outputTemplate) {
        var outputImage;
        var slices;
        var fullImageBlob;
        var integrityIsValid;

        outputImage = outputTemplate.scale === 1 ? state.loadedImage : imageProcessor.resizeImage(
            state.loadedImage,
            outputTemplate.width,
            outputTemplate.height
        );
        slices = await imageProcessor.createSlicedAssets(outputImage, outputTemplate);
        integrityIsValid = await imageProcessor.verifyReconstruction(outputImage, slices, outputTemplate);

        if (!integrityIsValid) {
            throw new Error('A conferência de integridade encontrou diferença entre a imagem original e os recortes.');
        }

        fullImageBlob = await imageProcessor.cropImage(outputImage, {
            x: 0,
            y: 0,
            width: outputTemplate.width,
            height: outputTemplate.height
        });
        return [{
            name: 'assinatura.png',
            blob: fullImageBlob,
            x: 0,
            y: 0,
            width: outputTemplate.width,
            height: outputTemplate.height,
            row: 0,
            column: 0,
            regionKey: null
        }].concat(slices);
    }

    async function ensureAssets() {
        var template = getTemplate();
        var outputTemplate = getOutputTemplate();
        var cacheKey = templateSelect.value + ':' + sizeSelect.value;

        if (!state.loadedImage) {
            throw new Error('Selecione uma imagem PNG.');
        }
        if (!validateLoadedImage()) {
            throw new Error('A imagem precisa ter ' + template.width + '×' + template.height + ' pixels.');
        }

        if (state.assets && state.assetTemplateKey === cacheKey) {
            return state.assets;
        }

        state.assets = await createAssetsForOutputTemplate(outputTemplate);
        state.assetTemplateKey = cacheKey;

        integrityBadge.classList.remove('is-hidden');
        return state.assets;
    }

    function renderEmptyPreview(message) {
        signaturePreview.innerHTML = '<div class="empty-preview"><span aria-hidden="true">▧</span><strong>O preview aparecerá aqui</strong><p>' +
            utils.escapeHtml(message) + '</p></div>';
        integrityBadge.classList.add('is-hidden');
    }

    function resizeSignaturePreview() {
        var scaler = signaturePreview.querySelector('.signature-preview-scaler');
        var inner = signaturePreview.querySelector('.signature-preview-inner');
        var template = getOutputTemplate();
        var availableWidth;
        var scale;

        if (!scaler || !inner) {
            return;
        }

        availableWidth = signaturePreview.clientWidth;
        scale = Math.min(1, availableWidth / template.width);
        inner.style.width = template.width + 'px';
        inner.style.height = template.height + 'px';
        inner.style.transform = 'scale(' + scale + ')';
        scaler.style.height = Math.ceil(template.height * scale) + 'px';
    }

    function renderSignaturePreview(assets, links) {
        var template = getOutputTemplate();
        var urlMap = {};
        var tableHtml;

        clearPreviewUrls();
        assets.forEach(function (asset) {
            var url = URL.createObjectURL(asset.blob);
            state.previewUrls.push(url);
            urlMap[asset.name] = url;
        });

        tableHtml = signatureGenerator.buildSignatureTableHtml({
            template: template,
            links: links,
            assets: assets,
            resolveAssetUrl: function (asset) {
                return urlMap[asset.name];
            }
        });

        signaturePreview.innerHTML = '<div class="signature-preview-scaler"><div class="signature-preview-inner">' +
            tableHtml + '</div></div>';
        resizeSignaturePreview();
    }

    async function updatePreview(showValidationError) {
        var assets;
        var links;

        setMessage(appMessage, '', '');
        setBusy(true, 'Atualizando...');
        try {
            assets = await ensureAssets();
            links = showValidationError ? getFormLinks() : getPreviewLinks();
            renderSignaturePreview(assets, links);
            if (showValidationError) {
                setMessage(appMessage, 'Preview atualizado. Clique nos elementos para testar os links.', 'success');
            }
        } catch (error) {
            setMessage(appMessage, error.message, 'error');
        } finally {
            setBusy(false);
        }
    }

    function setBusy(isBusy, primaryText, activeAction) {
        previewButton.disabled = isBusy;
        generateButton.disabled = isBusy;
        generateAllButton.disabled = isBusy;
        clearButton.disabled = isBusy;
        templateSelect.disabled = isBusy;
        sizeSelect.disabled = isBusy;
        imageInput.disabled = isBusy;
        generateButton.querySelector('span').textContent = isBusy && activeAction === 'selected' ?
            (primaryText || 'Gerando...') : (isBusy ? 'Aguarde...' : 'Baixar tamanho selecionado');
        generateAllButton.querySelector('span').textContent = isBusy && activeAction === 'all' ?
            (primaryText || 'Gerando...') : (isBusy ? 'Aguarde...' : 'Baixar os 3 tamanhos');
    }

    async function generateSignature(event) {
        var employeeName;
        var slug;
        var links;
        var assets;
        var html;
        var folderName;

        event.preventDefault();
        setMessage(appMessage, '', '');

        try {
            employeeName = document.getElementById('employee-name').value.trim();
            slug = utils.slugify(employeeName);
            if (!slug) {
                throw new Error('Informe o nome do colaborador.');
            }

            links = getFormLinks();
            setBusy(true, 'Gerando ZIP...', 'selected');
            assets = await ensureAssets();
            renderSignaturePreview(assets, links);
            html = signatureGenerator.buildSignatureDocument({
                template: getOutputTemplate(),
                links: links,
                assets: assets
            });
            folderName = 'assinatura-' + slug + (sizeSelect.value === 'original' ? '' : '-' + utils.slugify(getSize().label));

            await zipGenerator.generateSignatureZip({
                folderName: folderName,
                html: html,
                assets: assets
            });
            setMessage(
                appMessage,
                '✓ Assinatura ' + getSize().label.toLowerCase() + ' gerada com sucesso em ' +
                    getOutputTemplate().width + '×' + getOutputTemplate().height + ' px. O download do ZIP foi iniciado.',
                'success'
            );
        } catch (error) {
            setMessage(appMessage, 'Não foi possível gerar a assinatura.\nDetalhes: ' + error.message, 'error');
        } finally {
            setBusy(false);
        }
    }

    async function generateAllSizes() {
        var employeeName;
        var slug;
        var links;
        var variants = [];
        var sizeKeys = Object.keys(sizes);
        var archiveName;

        setMessage(appMessage, '', '');

        try {
            employeeName = document.getElementById('employee-name').value.trim();
            slug = utils.slugify(employeeName);
            if (!slug) {
                throw new Error('Informe o nome do colaborador.');
            }
            if (!state.loadedImage) {
                throw new Error('Selecione uma imagem PNG.');
            }
            if (!validateLoadedImage()) {
                throw new Error('A imagem precisa ter ' + getTemplate().width + '×' + getTemplate().height + ' pixels.');
            }

            links = getFormLinks();
            setBusy(true, 'Preparando 1 de 3...', 'all');

            for (var index = 0; index < sizeKeys.length; index += 1) {
                var sizeKey = sizeKeys[index];
                var size = sizes[sizeKey];
                var outputTemplate = imageProcessor.scaleTemplate(getTemplate(), size.scale);
                var assets;
                var html;

                generateAllButton.querySelector('span').textContent = 'Preparando ' + (index + 1) + ' de ' + sizeKeys.length + '...';
                assets = await createAssetsForOutputTemplate(outputTemplate);
                html = signatureGenerator.buildSignatureDocument({
                    template: outputTemplate,
                    links: links,
                    assets: assets
                });
                variants.push({
                    label: size.label,
                    folderName: utils.slugify(size.label) + '-' + outputTemplate.width + 'x' + outputTemplate.height,
                    width: outputTemplate.width,
                    height: outputTemplate.height,
                    html: html,
                    assets: assets
                });
            }

            generateAllButton.querySelector('span').textContent = 'Compactando ZIP...';
            archiveName = 'assinatura-' + slug + '-3-tamanhos';
            await zipGenerator.generateAllSizesZip({
                archiveName: archiveName,
                variants: variants
            });
            setMessage(
                appMessage,
                '✓ Os três tamanhos foram gerados com sucesso em um único ZIP: original, médio e compacto.',
                'success'
            );
        } catch (error) {
            setMessage(appMessage, 'Não foi possível gerar os três tamanhos.\nDetalhes: ' + error.message, 'error');
        } finally {
            setBusy(false);
        }
    }

    function clearForm() {
        var selectedTemplate = templateSelect.value;
        var selectedSize = sizeSelect.value;
        form.reset();
        templateSelect.value = selectedTemplate;
        sizeSelect.value = selectedSize;
        showRegions.checked = false;
        setMessage(appMessage, '', '');
        setMessage(imageValidation, '', '');
        resetImageState();
        updateTemplateDescription();
        updateSizeDescription();
        document.getElementById('employee-name').focus();
    }

    function handleTemplateChange() {
        localStorage.setItem('signatureGeneratorTemplate', templateSelect.value);
        updateTemplateDescription();
        populateSizes();
        invalidateAssets();
        renderRegionOverlay();
        if (state.loadedImage) {
            validateLoadedImage();
            if (state.imageIsValid) {
                updatePreview(false);
            } else {
                renderEmptyPreview('A imagem não corresponde às dimensões do modelo selecionado.');
            }
        }
    }

    function handleSizeChange() {
        updateSizeDescription();
        invalidateAssets();
        if (state.loadedImage && state.imageIsValid) {
            updatePreview(false);
        }
    }

    populateTemplates();
    renderEmptyPreview('Selecione uma imagem PNG compatível para começar.');

    templateSelect.addEventListener('change', handleTemplateChange);
    sizeSelect.addEventListener('change', handleSizeChange);
    imageInput.addEventListener('change', handleImageSelection);
    showRegions.addEventListener('change', function () {
        regionsOverlay.classList.toggle('is-visible', showRegions.checked);
    });
    previewButton.addEventListener('click', function () {
        updatePreview(true);
    });
    clearButton.addEventListener('click', clearForm);
    generateAllButton.addEventListener('click', generateAllSizes);
    form.addEventListener('submit', generateSignature);
    window.addEventListener('resize', resizeSignaturePreview);
    window.addEventListener('beforeunload', function () {
        clearPreviewUrls();
        if (state.imageObjectUrl) {
            URL.revokeObjectURL(state.imageObjectUrl);
        }
    });
}());
