'use strict';

module.exports = {
    title: __('m_product_backend_module_title'),
    author: 'Techmaster',
    version: '0.1.0',
    description: __('m_product_backend_module_desc'),
    permissions: [
        {
            name : 'index',
            title : 'View All product'
        },
        {
            name : 'create',
            title : 'Create products'
        },
        {
            name : 'edit',
            title : 'Edit products'
        },
        {
            name : 'delete',
            title : 'Delete products'
        },
        {
            name : 'category_index',
            title : 'View All product category'
        },
        {
            name : 'category_create',
            title : 'Create products category'
        },
        {
            name : 'category_edit',
            title : 'Edit products category'
        },
        {
            name : 'category_delete',
            title : 'Delete products category'
        },
        {
            name : 'order',
            title : 'Manage orders'
        }
    ],
    backend_menu: {
        title: __('m_product_backend_module_menu_backend_menu_title'),
        icon: 'fa fa-newspaper-o',
        menus: [
            {
                permission : 'index',
                title: __('m_product_backend_module_menu_backend_menu_index'),
                link: '/'
            },
            {
                permission : 'category_index',
                title: __('m_product_backend_module_menu_backend_menu_category_index'),
                link : '/categories'
            },
            {
                permission : 'order',
                title: __('m_product_backend_module_menu_backend_menu_order_index'),
                link : '/order'
            }
        ]
    },
    //is define this module has link to shows on menu
    add_link_menu : {
        category_product : {
            title : 'Product Category',
            route : '/product_category/link/menu',
            //list : '/products/{id}', // link to display all pages
            search : true
        },
        products : {
            title : 'Link Products',
            route : '/products/link/menu',
            list : '/products', // link to display all pages
            search : true
        }
    }
};

