(function () {
    'use strict';

    function buildReadme() {
        return [
            'ASSINATURA DE E-MAIL',
            '=======================',
            '',
            '1. Extraia todo o conteúdo deste arquivo ZIP para uma pasta.',
            '',
            '2. Abra o arquivo assinatura.html no navegador.',
            '',
            '3. Confira se todos os elementos aparecem corretamente.',
            '',
            '4. Pressione Ctrl+A.',
            '',
            '5. Pressione Ctrl+C.',
            '',
            '6. Abra o Microsoft Outlook.',
            '',
            '7. Acesse as configurações de assinatura.',
            '',
            '8. Crie ou edite uma assinatura.',
            '',
            '9. Cole utilizando Ctrl+V e salve.',
            '',
            '10. Envie um e-mail de teste para conferir a aparência e os links.',
            '',
            'TESTE OS LINKS:',
            '- Telefone',
            '- E-mail',
            '- WhatsApp',
            '- Instagram (se configurado)',
            '- LinkedIn (se configurado)',
            '- Site',
            '',
            'IMPORTANTE:',
            '- Mantenha a pasta assets ao lado de assinatura.html ao abrir o arquivo.',
            '- Não copie somente a imagem: use Ctrl+A e Ctrl+C na página aberta.',
            '- O ZIP foi gerado localmente no seu navegador; nenhum dado foi enviado para servidores.',
            ''
        ].join('\r\n');
    }

    function buildAllSizesReadme(variants) {
        var lines = [
            'ASSINATURAS DE E-MAIL - 3 TAMANHOS',
            '=====================================',
            '',
            'Este pacote contém três versões da mesma assinatura:',
            ''
        ];

        variants.forEach(function (variant) {
            lines.push('- ' + variant.label + ': ' + variant.width + 'x' + variant.height + ' px, na pasta ' + variant.folderName + '.');
        });

        return lines.concat([
            '',
            'COMO INSTALAR UMA DAS VERSÕES',
            '',
            '1. Abra a pasta do tamanho desejado.',
            '2. Abra o arquivo assinatura.html no navegador.',
            '3. Pressione Ctrl+A e depois Ctrl+C.',
            '4. Abra as configurações de assinatura do Microsoft Outlook.',
            '5. Crie ou edite uma assinatura, cole com Ctrl+V e salve.',
            '6. Envie um e-mail de teste e confira todos os links.',
            '',
            'IMPORTANTE:',
            '- Use apenas uma das três versões no Outlook.',
            '- Mantenha a pasta assets ao lado do respectivo assinatura.html.',
            '- Nenhum dado foi enviado para servidores durante a geração.',
            ''
        ]).join('\r\n');
    }

    function addSignatureToFolder(folder, variant) {
        var assetsFolder = folder.folder('assets');

        folder.file('assinatura.html', variant.html);
        folder.file('LEIA-ME.txt', buildReadme());
        variant.assets.forEach(function (asset) {
            assetsFolder.file(asset.name, asset.blob);
        });
    }

    async function generateSignatureZip(options) {
        var zip;
        var root;
        var assetsFolder;
        var zipBlob;

        if (typeof window.JSZip === 'undefined') {
            throw new Error('A biblioteca de geração do ZIP não foi carregada. Verifique sua conexão com a internet e tente novamente.');
        }

        zip = new window.JSZip();
        root = zip.folder(options.folderName);
        assetsFolder = root.folder('assets');

        root.file('assinatura.html', options.html);
        root.file('LEIA-ME.txt', buildReadme());
        options.assets.forEach(function (asset) {
            assetsFolder.file(asset.name, asset.blob);
        });

        zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });

        window.SignatureUtils.downloadBlob(zipBlob, options.folderName + '.zip');
        return zipBlob;
    }

    async function generateAllSizesZip(options) {
        var zip;
        var root;
        var zipBlob;

        if (typeof window.JSZip === 'undefined') {
            throw new Error('A biblioteca de geração do ZIP não foi carregada. Verifique sua conexão com a internet e tente novamente.');
        }

        zip = new window.JSZip();
        root = zip.folder(options.archiveName);
        root.file('LEIA-ME.txt', buildAllSizesReadme(options.variants));
        options.variants.forEach(function (variant) {
            addSignatureToFolder(root.folder(variant.folderName), variant);
        });

        zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });

        window.SignatureUtils.downloadBlob(zipBlob, options.archiveName + '.zip');
        return zipBlob;
    }

    window.SignatureZipGenerator = {
        buildReadme: buildReadme,
        buildAllSizesReadme: buildAllSizesReadme,
        generateSignatureZip: generateSignatureZip,
        generateAllSizesZip: generateAllSizesZip
    };
}());
