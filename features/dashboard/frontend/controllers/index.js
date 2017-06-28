'use strict';

const promise = require('arrowjs').Promise;

module.exports = function (controller, component, application) {

    const redis = application.redisClient;
    const adminPrefix = application.getConfig('admin_prefix') || 'admin';
    const redisPrefix = application.getConfig('redis_prefix') || 'arrowCMS_';
    const itemOfPage = application.getConfig('pagination').numberItem || 10;

    controller.index = function (req, res) {
        let slide_limit = 5
        promise.all(
            [
                // Find all product
                application.models.product.findAll({
                    limit: slide_limit,
                    order: 'id ASC'
                }),
                // Find all product
                application.models.product.findAll({
                    where: {
                        status: 1
                    },
                    limit: slide_limit,
                    order: 'id DESC'
                }),
                application.models.product.findAll({
                    where: {
                        status: 0
                    },
                    limit: slide_limit,
                    order: 'id DESC'
                })

            ]
        ).then(function (results) {
            if (results) {
                // Render view
                res.frontend.render('index', {
                    products: results[0],
                    olds: results[1],
                    news: results[2]
                });
            } else {
                // Redirect to 404 if post not exist
                res.frontend.render('_404');
            }
        }).catch(function (err) {
            console.log(err.stack),
                res.frontend.render('_404');
        });
    };
};
