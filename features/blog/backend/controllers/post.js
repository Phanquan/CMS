'use strict';

let slug = require('slug');
let _ = require('lodash');
let promise = require('bluebird');


let _log = require('arrowjs').logger;
let route = 'blog';
let edit_view = 'post/new';


module.exports = function (controller, component, app) {


    let itemOfPage = app.getConfig('pagination').numberItem || 10;
    let isAllow = ArrowHelper.isAllow;

    controller.postlist = function (req, res) {
        // Add buttons
        let toolbar = new ArrowHelper.Toolbar();

        toolbar.addCreateButton(isAllow(req,'post_create'), '/admin/blog/posts/create');
        toolbar.addDeleteButton(isAllow(req,'post_delete'));
        toolbar = toolbar.render();

        res.locals.user = req.user;

        //// Get current page and default sorting
        let page = req.params.page || 1;
        //let column = req.params.sort || 'id';
        //let order = req.params.order || 'desc';
       // res.locals.root_link = '/admin/blog/posts/page/' + page + '/sort';

        // Store search data to session
        let session_search = {};
        if (req.session.search) {
            session_search = req.session.search;
        }
        session_search[route + '_post_list'] = req.url;
        req.session.search = session_search;


        // Config columns
        let tableStructure = [
            {
                column: "id",
                width: '1%',
                header: "",
                type: 'checkbox'
            },
            {
                column: 'title',
                width: '25%',
                header: __('all_table_column_title'),
                link: '/admin/blog/posts/{id}',
                filter: {
                    data_type: 'string'
                }
            },
            {
                column: 'alias',
                width: '25%',
                header: __('all_table_column_alias'),
                filter: {
                    data_type: 'string'
                }
            },
            {
                column: 'user.display_name',
                width: '20%',
                header: __('all_table_column_author'),
                filter: {
                    data_type: 'string',
                    filter_key: 'user.display_name'
                }
            },
            {
                column: 'created_at',
                width: '15%',
                header: __('m_blog_backend_page_filter_column_created_date'),
                type: 'datetime',
                filter: {
                    data_type: 'datetime',
                    filter_key: 'created_at'
                }
            },
            {
                column: 'published',
                width: '10%',
                header: __('all_table_column_status'),
                type: 'custom',
                alias: {
                    "1": "Publish",
                    "0": "Draft"
                },
                filter: {
                    type: 'select',
                    filter_key: 'published',
                    data_source: [
                        {
                            name: 'Publish',
                            value: 1
                        },
                        {
                            name: 'Draft',
                            value: 0
                        }
                    ],
                    display_key: 'name',
                    value_key: 'value'
                }
            }
        ];


        let filter = ArrowHelper.createFilter(req, res, tableStructure, {
            rootLink: '/admin/blog/posts',
            limit: itemOfPage,
            customCondition: "AND type='post'"
        });


        // Find all posts
        app.models.post.findAndCountAll({
            where: filter.conditions,
            include: [
                {
                    model: app.models.user,
                    attributes: ['display_name'],
                    where: ['1 = 1']
                }
            ],
            limit: filter.limit,
            offset: (page - 1) * itemOfPage
        }).then(function (results) {
            //console.log("++++++++",JSON.stringify(results.rows,null,2));
            let totalPage = Math.ceil(results.count / itemOfPage);

            // Render view
            res.backend.render('post/index', {
                title: __('m_blog_backend_post_render_title'),
                totalPage: totalPage,
                items: results.rows,
                currentPage: page,
                toolbar: toolbar
            });
        }).catch(function (error) {
            req.flash.error('Name: ' + error.name + '<br />' + 'Message: ' + error.message);

            // Render view if has error
            res.backend.render('post/index', {
                title: __('m_blog_backend_post_render_title'),
                totalPage: 1,
                items: null,
                currentPage: page,
                toolbar: toolbar
            });
        });

    };


    controller.postview = function (req, res) {
        res.locals.user = req.user;

        // Add button
        let back_link = '/admin/blog/posts/page/1';
        let search_params = req.session.search;
        if (search_params && search_params[route + '_post_list']) {
            back_link = '/admin' + search_params[route + '_post_list'];
        }

        let toolbar = new ArrowHelper.Toolbar();
        toolbar.addBackButton(back_link);
        //todo: check permission
        toolbar.addSaveButton(isAllow(req,'post_create'));
        toolbar.addDeleteButton(isAllow(req,'post_delete'));
        toolbar = toolbar.render();


        promise.all([
            app.models.category.findAll({
                order: "id asc"
            }),
            app.models.user.findAll({
                order: "id asc"
            }),
            app.models.post.find({
                include: [app.models.user],
                where: {
                    id: req.params.cid,
                    type: 'post'
                }
            })
        ]).then(function (results) {
            res.locals.viewButton = 'admin/blog/posts/' + results[2].id;

            let data = results[2];
            data.full_text = data.full_text.replace(/&lt/g, "&amp;lt");
            data.full_text = data.full_text.replace(/&gt/g, "&amp;gt");

            res.backend.render(edit_view, {
                title: __('m_blog_backend_post_render_update'),
                categories: results[0],
                users: results[1],
                post: data,
                toolbar: toolbar
            });
        }).catch(function (error) {
            req.flash.error('Name: ' + error.name + '<br />' + 'Message: ' + error.message);
            res.redirect(back_link);
        });
    };


    controller.postdelete = function (req, res) {

        res.locals.user = req.user;
        app.models.post.findAll({
            where: {
                id: {
                    $in: req.body.ids.split(',')
                }
            }
        }).then(function (posts) {
            promise.map(posts, function (post) {
                let tag = post.categories;
                if (tag != null && tag != '') {
                    tag = tag.split(':');
                    tag.shift();
                    tag.pop(tag.length - 1);

                    if (tag.length > 0) {
                        tag.forEach(function (id) {
                            app.models.category.findById(id).then(function (cat) {
                                let count = +cat.count - 1;
                                cat.updateAttributes({
                                    count: count
                                });
                            });
                        });
                    }
                }

                return app.models.post.destroy({
                    where: {
                        id: post.id
                    }
                }).catch(function (err) {
                    req.flash.error('Post id: ' + post.id + ' | ' + err.name + ' : ' + err.message);
                });
            });
        }).then(function () {
            req.flash.success(__('m_blog_backend_post_flash_delete_success'));
            res.sendStatus(200);
        }).catch(function (err) {
            console.log('postDelete error : ', err);
        });
    };


    controller.postupdate = function (req, res, next) {

        res.locals.user = req.user;

        let data = req.body;
        data.categories = data.categories || "";
        data.author_visible = (data.author_visible != null);
        if (!data.published) data.published = 0;

        app.models.post.findById(req.params.cid).then(function (post) {
            let tag = post.categories;
            if (tag != null && tag != '') {
                tag = tag.split(':');
                tag.shift();
                tag.pop(tag.length - 1);
            } else tag = [];

            let newtag = data.categories;
            if (newtag != null && newtag != '') {
                newtag = newtag.split(':');
                newtag.shift();
                newtag.pop(newtag.length - 1);
            } else newtag = [];

            /**
             * Update count for category
             */
            let onlyInA = [],
                onlyInB = [];

            if (Array.isArray(tag) && Array.isArray(newtag)) {
                onlyInA = tag.filter(function (current) {
                    return newtag.filter(function (current_b) {
                            return current_b == current
                        }).length == 0
                });
                onlyInB = newtag.filter(function (current) {
                    return tag.filter(function (current_a) {
                            return current_a == current
                        }).length == 0
                });

            }

            if (data.published != post.published && data.published == 1) data.published_at = Date.now();

            return post.updateAttributes(data).then(function () {
                return promise.all([
                    promise.map(onlyInA, function (id) {
                        return app.models.category.findById(id).then(function (tag) {
                            let count = +tag.count - 1;
                            return tag.updateAttributes({
                                count: count
                            })
                        });
                    }),
                    promise.map(onlyInB, function (id) {
                        return app.models.category.findById(id).then(function (tag) {
                            let count = +tag.count + 1;
                            return tag.updateAttributes({
                                count: count
                            })
                        });
                    })
                ])
            })
        }).then(function () {
            req.flash.success(__('m_blog_backend_post_flash_update_success'));
            next();
        }).catch(function (error) {
            req.flash.error('Name: ' + error.name + '<br />' + 'Message: ' + error.message);
            res.redirect(back_link);
        });

    };


    controller.postcreate = function (req, res) {
        res.locals.user = req.user;

        // Add button
        let back_link = '/admin/blog/posts/page/1';
        let search_params = req.session.search;
        if (search_params && search_params[route + '_post_list']) {
            back_link = '/admin' + search_params[route + '_post_list'];
        }

        let toolbar = new ArrowHelper.Toolbar();
        toolbar.addBackButton(back_link);
        //todo: check permission
        toolbar.addSaveButton(isAllow(req,'post_create'));
        toolbar = toolbar.render();

        promise.all([
            app.models.category.findAll({
                order: "id asc"
            }),
            app.models.user.findAll({
                order: "id asc"
            })
        ]).then(function (results) {
            res.backend.render(edit_view, {
                title: __('m_blog_backend_post_render_create'),
                categories: results[0],
                users: results[1],
                toolbar: toolbar
            });
        }).catch(function (error) {
            req.flash.error('Name: ' + error.name + '<br />' + 'Message: ' + error.message);
            res.redirect(back_link);
        });
    };

    controller.postsave = function (req, res) {

        res.locals.user = req.user;
        //console.log(req.user);
        let data = req.body;
        data.created_by = req.user.id;
        if (data.alias == null || data.alias == '')
            data.alias = slug(data.title).toLowerCase();
        data.type = 'post';
        if (!data.published) data.published = 0;
        if (data.published == 1) data.published_at = Date.now();

        let post_id = 0;

        app.models.post.create(data).then(function (post) {
            post_id = post.id;
            let tag = post.categories;

            if (tag != null && tag != '') {
                tag = tag.split(':');
                tag.shift();
                tag.pop(tag.length - 1);

                return promise.map(tag, function (id) {
                    return app.models.category.findById(id).then(function (tag) {
                        let count = +tag.count + 1;
                        return tag.updateAttributes({
                            count: count
                        })
                    });
                });
            }
        }).then(function () {
            req.flash.success(__('m_blog_backend_post_flash_create_success'));
            res.redirect('/admin/blog/posts/' + post_id);
        }).catch(function (err) {
            if (err.name == 'SequelizeUniqueConstraintError') {
                req.flash.error("Alias was duplicated");
            } else {
                req.flash.error(err.message);
            }
            res.redirect('/admin/blog/posts/create');
        });
    };

    controller.postread = function (req, res, next, id) {

        res.locals.user = req.user;
        app.models.post.findById(id).then(function (post) {
            req.post = post;
            next();
        });
    };

    //controller.hasAuthorization = function (req, res, next) {
    //    console.log("====hasAuthorization====");
    //    res.locals.user = req.user;
    //    return next((req.post.created_by !== req.user.id));
    //}

};