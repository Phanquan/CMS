'use strict';

const promise = require('arrowjs').Promise;

module.exports = function (controller, component, application) {

    let redis = application.redisClient;
    let adminPrefix = application.getConfig('admin_prefix') || 'admin';
    let redisPrefix = application.getConfig('redis_prefix') || 'arrowCMS_';
    let itemOfPage = application.getConfig('pagination').numberItem || 10;

    controller.list = function (req, res) {
        let page = req.params.page || 1;

        promise.all(
            [
                application.models.product.findAndCountAll({
                    limit: itemOfPage,
                    offset: (page - 1) * itemOfPage,
                    order: 'id DESC'
                }),
                application.models.product.findAll({
                    where: {
                        price_sale: {
                            $gt: 0
                        }
                    },
                    limit: 3,
                    order: 'id DESC'
                })
            ]
        ).then(function (results) {
            if (results[0]) {
                let totalPage = Math.ceil(results[0].count / itemOfPage);
                res.frontend.render('products', {
                    products: results[0].rows,
                    recommended: results[1],
                    totalPage: totalPage,
                    currentPage: page
                })
            } else {
                res.frontend.render404(req, res);
            }
        }).catch(function (err) {
            console.log(err);
            res.frontend.render('_404');
        });
    };

    controller.listByCategory = function (req, res) {
        let page = req.params.page || 1;
        let catid = req.params.catid || 0;
        promise.all(
            [
                application.models.product.findAndCountAll({
                    where: {
                        categories: {
                            $ilike: '%:' + catid + ':%',
                        }
                    },
                    limit: itemOfPage,
                    offset: (page - 1) * itemOfPage,
                    order: 'id DESC'
                }),
                application.models.product.findAll({
                    where: {
                        price_sale: {
                            $gt: 0
                        }
                    },
                    limit: 3,
                    order: 'id DESC'
                }),
                application.models.product_category.find({
                    where: {
                        id: catid
                    }
                })
            ]
        ).then(function (results) {
            if (results[0]) {
                let totalPage = Math.ceil(results[0].count / itemOfPage);

                res.frontend.render('products', {
                    products: results[0].rows,
                    recommended: results[1],
                    category: results[2],
                    totalPage: totalPage,
                    currentPage: page
                })
            } else {
                res.frontend.render('404');
            }
        }).catch(function (err) {
            res.frontend.models.render('404');
        });
    };

    controller.detail = function (req, res) {
        promise.all(
            [
                // Find post by id
                application.models.product.find({
                    include: [
                        {
                            model: application.models.user,
                            attributes: ['id', 'display_name', 'user_email', 'user_image_url']
                        }
                    ],
                    where: {
                        id: req.params.pid
                    }
                }),
                // Find all categories
                application.models.product_category.findAndCountAll({
                    order: "id ASC"
                }),
                //recommended
                application.models.product.findAll({
                    where: {
                        price_sale: {
                            $gt: 0
                        }
                    },
                    limit: 5,
                    order: 'id DESC'
                })
            ]
        ).then(function (results) {
            if (results[0]) {
                let count_views = results[0].count_views;
                count_views = Number(count_views) + 1;

                application.models.product.update({
                    count_views: count_views
                }, {
                        where: {
                            id: results[0].id
                        }
                    }).then(function (re) {
                        // Render view
                        let images = results[0].images.split(':::');
                        res.frontend.render('detail', {
                            item: results[0],
                            categories: results[1].rows,
                            recommended: results[2],
                            images: images
                        });
                    })
            } else {
                // Redirect to 404 if post not exist
                res.frondend.render('_404');
            }
        }).catch(function (err) {
            console.log(err);
            res.frontend.render('_404');
        });
    };

    controller.view_cart = function (req, res) {
        let products_ids = [];
        // if req.session.cart object already exists
        if (req.session.cart) {
            products_ids = Object.keys(req.session.cart);
            console.log(products_ids);
            // Find post by id
            application.models.product.findAll({
                where: {
                    id: {
                        in: products_ids
                    }
                }
            }).then(function (results) {
                // cart_detail is the full detail of products in cart
                // cart is the req.session.cart object so we can get product quantity in cart
                res.frontend.render('cart', { cart_detail: results, cart: req.session.cart });
            }).catch(function (err) {
                res.frontend.render('cart');
            })
        } else {
            // if there is no req.session.cart yet, we set it as an object
            req.session.cart = {};
            res.frontend.render('cart');
        }
    };

    controller.add_cart = function (req, res) {
        let products_ids = [];

        // Set cart as an object in the format: {'product_name': product_quantity}
        if (!req.session.cart) {
            console.log('Khởi tạo cart 1 lần duy nhất');
            req.session.cart = {};
        }

        // Get ids of all products in the cart
        products_ids = Object.keys(req.session.cart);

        if (products_ids.length == 0) {
            // if there is no product in the cart -> add product
            req.session.cart[req.params.pid] = 1;
        } else { // one or more products are in the cart
            
            if (products_ids.indexOf(req.params.pid) === -1 ) {
                // if the product is not yet in the cart
                req.session.cart[req.params.pid] = 1;
            } else {
                // if the product is already in cart -> increase its quantity
                let product_index = products_ids.indexOf(req.params.pid);
                req.session.cart[products_ids[product_index]] += 1;
            }
        }

        // variable to count total number of products in shopping cart
        let cart_total = 0;
        // count total products in cart to show in shopping badge 
        for (let item in req.session.cart) {
            cart_total += parseInt(req.session.cart[item]);
        }
        res.send(String(cart_total));
    };

    controller.update_cart = function (req, res) {
        // update_cart is called when change product quantity by quantity input field in cart html page 

        // update the product quantity in cart
        req.session.cart[req.params.pid] = req.params.newQuantity;

        // variable to count total number of products in shopping cart
        let cart_total = 0;
        console.log(req.session.cart);
        // count total products in cart to show in shopping badge 
        for (let item in req.session.cart) {
            cart_total += parseInt(req.session.cart[item]);
        }
        console.log('tính rổng sản phẩm là ');
        console.log(cart_total);
        res.send(String(cart_total));
    };

    controller.delete_cart = function (req, res) {
        console.log(req.session.carts);
        if (req.body.id) {
            //delete one product from the cart
            delete req.session.cart[req.body.id];
            console.log('After deleting ' + req.session.carts);
            // send over the updated cart
            res.send(req.session.cart);
        } else {
            //delete all products in cart
            if (req.session.cart) {
                req.session.cart = {};
            }
            console.log('After deleting ' + req.session.cart);
            res.redirect('/');
        }
    };

    controller.submit_cart = function (req, res) {
        let form = req.body;
        let data = JSON.parse(form.products);
        form.products = data;
        application.models.order.create(form).then(function (result) {
            if (result) {
                req.session.cart = {};
                cart_total = 0;
                res.end('success');
            } else {
                res.end('fail');
            }

        }).catch(function (err) {
            console.log(err);
            res.end('fail');
        });
    };

    controller.search = function (req, res) {
        let page = req.query.page || 1;
        let strSearch = req.query['txt'] || '';
        application.models.product.findAndCountAll({
            where: ["\"title\" ILIKE '%" + strSearch + "%' OR \"desc\" ILIKE '%" + strSearch + "%' OR \"content\" ILIKE '%" + strSearch + "%'"],
            limit: itemOfPage,
            offset: (page - 1) * itemOfPage
        }
        ).then(function (results) {
            if (results) {
                let totalPage = Math.ceil(results.count / itemOfPage);
                res.frontend.render('products', {
                    products: results.rows,
                    category: {
                        name: 'Tìm kiếm theo : "' + strSearch + '"'
                    },
                    totalPage: totalPage,
                    currentPage: page,
                    routeSearch: '/products/search?txt=' + strSearch
                })
            } else {
                res.frontend.render('products', {
                    products: results.rows,
                    category: {
                        name: 'không tìm thấy "' + strSearch + '"'
                    }
                })
            }
        }).catch(function (err) {
            res.frontend.render('_404');
        })
    }
};