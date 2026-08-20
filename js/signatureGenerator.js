(function () {
    'use strict';

    var escapeHtml = window.SignatureUtils.escapeHtml;

    function groupSlicesByColumn(assets) {
        return assets.reduce(function (columns, asset) {
            if (asset.name === 'assinatura.png') {
                return columns;
            }
            if (!columns[asset.column]) {
                columns[asset.column] = [];
            }
            columns[asset.column].push(asset);
            return columns;
        }, []);
    }

    function buildImageHtml(asset, source, altText) {
        return '<img src="' + escapeHtml(source) + '" width="' + asset.width + '" height="' + asset.height +
            '" border="0" alt="' + escapeHtml(altText || '') + '" style="display:block;width:' + asset.width +
            'px;height:' + asset.height + 'px;max-width:none;border:0;outline:none;text-decoration:none;vertical-align:top;' +
            'margin:0;padding:0;font-size:0;line-height:0;mso-line-height-rule:exactly;">';
    }

    function buildLinkedContent(imageHtml, asset, links) {
        var href = asset.regionKey ? links[asset.regionKey] : '';
        var isWebLink = /^(https?:)/i.test(href || '');

        if (!href) {
            return imageHtml;
        }

        return '<a href="' + escapeHtml(href) + '"' +
            (isWebLink ? ' target="_blank" rel="noopener noreferrer"' : '') +
            ' style="display:block;width:' + asset.width + 'px;height:' + asset.height +
            'px;margin:0;padding:0;border:0;font-size:0;line-height:0;mso-line-height-rule:exactly;text-decoration:none;">' +
            imageHtml + '</a>';
    }

    function buildColumnHtml(column, resolveAssetUrl, links, isFirstColumn) {
        var html = [];

        column.sort(function (first, second) { return first.row - second.row; }).forEach(function (asset, rowIndex) {
            var altText = isFirstColumn && rowIndex === 0 ? 'Assinatura de e-mail' : '';
            var imageHtml = buildImageHtml(asset, resolveAssetUrl(asset), altText);
            html.push(buildLinkedContent(imageHtml, asset, links));
        });

        return html.join('');
    }

    function buildSignatureTableHtml(options) {
        var template = options.template;
        var links = options.links;
        var assets = options.assets;
        var resolveAssetUrl = options.resolveAssetUrl;
        var fullImage = assets.find(function (asset) { return asset.name === 'assinatura.png'; });
        var columns = groupSlicesByColumn(assets);
        var backgroundUrl;
        var html = [];

        if (!fullImage || columns.length === 0) {
            throw new Error('Os arquivos visuais da assinatura não foram gerados.');
        }

        backgroundUrl = resolveAssetUrl(fullImage);
        html.push('<table role="presentation" width="' + template.width + '" height="' + template.height +
            '" cellpadding="0" cellspacing="0" border="0" style="width:' + template.width + 'px;height:' +
            template.height + 'px;border-collapse:collapse;border-spacing:0;mso-table-lspace:0pt;mso-table-rspace:0pt;' +
            'margin:0;padding:0;table-layout:fixed;font-size:0;line-height:0;mso-line-height-rule:exactly;">');
        html.push('<tbody><tr height="' + template.height + '" style="height:' + template.height +
            'px;margin:0;padding:0;font-size:0;line-height:0;mso-line-height-rule:exactly;">');
        html.push('<td width="' + template.width + '" height="' + template.height + '" align="left" valign="top" background="' +
            escapeHtml(backgroundUrl) + '" style="width:' + template.width + 'px;height:' + template.height +
            'px;vertical-align:top;background-color:#ffffff;background-image:url(' + escapeHtml(backgroundUrl) +
            ');background-repeat:no-repeat;background-position:left top;background-size:' + template.width + 'px ' +
            template.height + 'px;font-size:0;line-height:0;mso-line-height-rule:exactly;margin:0;padding:0;border:0;">');
        html.push('<!--[if gte mso 9]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:' +
            template.width + 'px;height:' + template.height + 'px;"><v:fill type="frame" src="' + escapeHtml(backgroundUrl) +
            '" color="#ffffff"/><v:textbox inset="0,0,0,0"><![endif]-->');
        html.push('<table role="presentation" width="' + template.width + '" height="' + template.height +
            '" cellpadding="0" cellspacing="0" border="0" style="width:' + template.width + 'px;height:' +
            template.height + 'px;border-collapse:collapse;border-spacing:0;mso-table-lspace:0pt;mso-table-rspace:0pt;' +
            'margin:0;padding:0;table-layout:fixed;font-size:0;line-height:0;mso-line-height-rule:exactly;"><tbody>');
        html.push('<tr height="' + template.height + '" style="height:' + template.height +
            'px;margin:0;padding:0;font-size:0;line-height:0;mso-line-height-rule:exactly;">');

        columns.forEach(function (column, columnIndex) {
            var columnWidth = column[0].width;
            html.push('<td width="' + columnWidth + '" height="' + template.height +
                '" align="left" valign="top" style="width:' + columnWidth + 'px;height:' + template.height +
                'px;vertical-align:top;font-size:0;line-height:0;mso-line-height-rule:exactly;margin:0;padding:0;border:0;overflow:hidden;">');
            html.push(buildColumnHtml(column, resolveAssetUrl, links, columnIndex === 0));
            html.push('</td>');
        });

        html.push('</tr></tbody></table>');
        html.push('<!--[if gte mso 9]></v:textbox></v:rect><![endif]-->');
        html.push('</td></tr></tbody></table>');

        return html.join('');
    }

    function buildSignatureDocument(options) {
        var tableHtml = buildSignatureTableHtml({
            template: options.template,
            links: options.links,
            assets: options.assets,
            resolveAssetUrl: function (asset) {
                return 'assets/' + asset.name;
            }
        });

        return '<!DOCTYPE html>\n' +
            '<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">\n' +
            '<head>\n' +
            '    <meta charset="UTF-8">\n' +
            '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
            '    <meta name="format-detection" content="telephone=no">\n' +
            '    <meta http-equiv="X-UA-Compatible" content="IE=edge">\n' +
            '    <title>Assinatura de e-mail</title>\n' +
            '    <!--[if mso]>\n' +
            '    <style type="text/css">table { border-collapse: collapse; } td, div { padding: 0; }</style>\n' +
            '    <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>\n' +
            '    <![endif]-->\n' +
            '</head>\n' +
            '<body style="margin:0;padding:0;background:#ffffff;font-size:0;line-height:0;">\n' +
            tableHtml + '\n' +
            '</body>\n' +
            '</html>\n';
    }

    window.SignatureGenerator = {
        buildSignatureTableHtml: buildSignatureTableHtml,
        buildSignatureDocument: buildSignatureDocument
    };
}());
