/**
 * Created by NLinh2911 on 22/06/2017.
 */
'use strict';
module.exports = {
    handler: function (price, lang) {
        if (lang === 'vi-VN') {
            let newPrice = price.toLocaleString(lang);
            return newPrice + ' đ';
        } else {
            let newPrice = price.toLocaleString('en-US');
            return '$ ' + newPrice ;
        }
    }
};