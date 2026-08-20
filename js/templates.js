(function () {
    'use strict';

    window.SIGNATURE_TEMPLATES = {
        expresso900x230: {
            name: 'Assinatura - 900x230',
            width: 900,
            height: 230,
            regions: {
                phone: {
                    label: 'TELEFONE',
                    x: 578,
                    y: 115,
                    width: 322,
                    height: 30
                },
                email: {
                    label: 'E-MAIL',
                    x: 578,
                    y: 145,
                    width: 322,
                    height: 34
                },
                whatsapp: {
                    label: 'WHATSAPP',
                    x: 139,
                    y: 179,
                    width: 28,
                    height: 51
                },
                instagram: {
                    label: 'INSTAGRAM',
                    x: 173,
                    y: 179,
                    width: 28,
                    height: 51
                },
                linkedin: {
                    label: 'LINKEDIN',
                    x: 207,
                    y: 179,
                    width: 28,
                    height: 51
                },
                website: {
                    label: 'SITE',
                    x: 241,
                    y: 179,
                    width: 28,
                    height: 51
                }
            }
        }
    };

    window.SIGNATURE_SIZES = {
        original: {
            label: 'Original',
            scale: 1
        },
        medium: {
            label: 'Médio',
            scale: 0.8
        },
        compact: {
            label: 'Compacto',
            scale: 0.65
        }
    };
}());
