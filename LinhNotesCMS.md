# ARROW CMS

## Product Feature
### From Eshopper, update and then add product feature to ArrowCMS
* Make price display more flexible when switching languages
* Store and set VAT dynamically - In product management, admin can set and change VAT

* Convert display_price() to use toLocaleString
### Backend:
* Fix tables in product backend menu, edit tableStructure of product category table
* Error: upload images while creating a new product -> uploading image changes the photo name

* Change table column names with values in language files -> create module product section in language files
```js
    /** Module product */
    "m_product_backend_render_create": "Create New Product",
    "m_product_backend_render_update": "Edit & Update Product",
    "m_product_backend_flash_create_success": "Product created successfully",
    "m_product_backend_flash_delete_success": "Product deleted successfully",
    "m_product_backend_flash_update_success": "Product updated successfully",
    "m_product_backend_flash_update_error": "Product updated unsuccessfully",
    // create new product form 
    "m_product_backend_views_form_content": "Product Detail Description",
    "m_product_backend_views_form_short_desc": "Short Description",
    "m_product_backend_views_form_image": "Product Image",
    "m_product_backend_views_form_popup_choose_image": "Choose product image",
    "m_product_backend_views_form_product_status": "Product Status",
    "m_product_backend_views_form_product_status_option_old": "old",
    "m_product_backend_views_form_product_status_option_new": "new",
    "m_product_backend_views_form_category": "Category",
    "m_product_backend_views_form_category_placeholder": "Select Category",
    "m_product_backend_views_form_image_placeholder": "Click here to select a file",
    // order status in order list
    "m_product_backend_views_order_status": "Order Status",
    "m_product_backend_views_order_status_option_completed": "Completed",
    "m_product_backend_views_order_status_option_shipping": "Shipping",
    "m_product_backend_views_order_status_option_pending": "Pending",
    // module title
    "m_product_backend_module_title": "Product",
    "m_product_backend_module_desc": "Product Manager",
    // display in backend main right side navigation menu
    "m_product_backend_module_menu_backend_menu_title": "Product",
    "m_product_backend_module_menu_backend_menu_index": "Product List",
    "m_product_backend_module_menu_backend_menu_category_index": "Category List",
    "m_product_backend_module_menu_backend_menu_order_index": "Order List",

```


* Routes in a feature: `/admin/:feature/:action` e.g. `/admin/products/categories`
* The part `/admin/:feature` is fixed,  `:feature` is read from feature folder name. We can only change the part after `/admin/:feature` in route.js and feature.js of that feature

```js
```

* `products/detail/:productId` encounters a bug: 'column user.user_login does not exits'. Table "arr_user" do not have column user_login

#### feature.js: 
* Permission shows what actions can be performed in this feature and their corresponding permission

```js
// features/products/feature.js
    permissions: [
        {
            name : 'index',
            title : 'View All product'
        },
        {
            name : 'create',
            title : 'Create products'
        },
```
* In route.js, each route request may have permission check, for example, only user with "create" persmission can create a new product
```js
// features/products/backend/route.js
        "/products/create": {
            get: {
                handler: comp.productCreate,
                authenticate: true,
                permissions: "create"
            },
            post: {
                handler: comp.productSave,
                authenticate: true,
                permissions: "create"
            }
        },
```
* Also, in feature.js, you can specify sub menu of products to be shown in backend men.
* With the backend_menu below, under products backend menu, you will have 3 sub menus:
  * Product List -> Permission 'index' -> Access Route: 'admin/products' 
  * Category List -> Permission 'category_index' -> Access Route: 'admin/products/categories' 
  * Order List -> Permission 'order_index' -> Access Route: 'admin/product/order' 
```js
// features/products/feature.js
    backend_menu: {
        title: __('m_product_backend_module_menu_backend_menu_title'),
        icon: 'fa fa-newspaper-o',
        menus: [
            {
                permission : 'index',
                title: __('m_product_backend_module_menu_backend_menu_index'),// the displayed content is in lang/en_US.js or vi_VN.js
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
```

* Also, you may want to add products or product categories to menu in front end
* With add_link_menu, you can access product category and products when creating a new menu in menu feature.
```js
// features/products/feature.js
    add_link_menu : {
        category_product : {
            title : 'Product Category',
            route : '/products/category/link/menu',
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
```

## BUGS: 
#### Cannot upload images to server when creating new products 
* ERROR: cannot rename uploaded images 
* SOLUTION: do not convert image absolute path to lower case
```js
// in features/products/backend/controller/product.js
controller.productUploadImage = function (req, res) { 
    // remove toLowerCase() from paths
    // old: newPath = newPath.replace(/ /g,'_').toLowerCase();
    newPath = newPath.replace(/ /g,'_');
    // old: res.send('/img/products/'+files.image.name.replace(/ /g,'_').toLowerCase());
    res.send('/img/products/'+files.image.name.replace(/ /g,'_');
}
```
#### Cannot upload images to server when creating blog posts 
* ERROR: EXDEV: cross-device link not permitted -> fs.rename error (happens with linux distro)
* SOLUTION: use 'fs-extra' module -> 
```js
// in features/upload/backend/controllers/index.js
// use fs-extra module that is already included in arrowjs
const fsExtra = require('arrowjs').fs; 
// fsExtra.move will attempts to perform fs.rename() first, if fails, it then tries fs.copy + fs.unlink before failing
controller.upload = function (req, res) {
  // change all fs.rename(...) to fsExtra.move(...)
   fsExtra.move(files["files[]"].path, result, function (err) {
      if (err) logger.error(err);
   });
}
```

### Blog archive routes: 
* ERROR: SQL query in controller.listArchive is wrong
```js
// features/blog/frontend/route.js
    controller.listArchive = function (req, res) {
        let month_ = req.params.month || '01';
        let year_ = req.params.year || '2000';
        let page = req.params.page || 1;

        let number_item = app.getConfig('pagination').frontNumberItem || 10;

        let sql = 'select posts.*,users.user_email,users.user_url,users.display_name,' +
            'users.user_image_url,users.user_status' +
            'from arr_post as posts left outer join arr_user as users on posts.created_by = users.id WHERE' +
            ' "posts"."type" = \'post\' AND "posts"."published" = 1 AND EXTRACT(MONTH FROM posts.created_at ) = ' + month_ + ' AND EXTRACT(YEAR FROM posts.created_at) = ' + year_ +
            ' ORDER BY posts.id ASC OFFSET ' + (page - 1) * number_item + ' LIMIT ' + number_item;

        let sqlCount = 'select count(*) ' +
            'from arr_post as posts WHERE' +
            ' "posts"."type" = \'post\' AND "posts"."published" = 1 AND EXTRACT(MONTH FROM posts.created_at ) = ' + month_ + ' AND EXTRACT(YEAR FROM posts.created_at) = ' + year_;

        app.models.rawQuery(sql).then(function (result) {
            if (result) {
                // Render view
                app.models.rawQuery(sqlCount)
                    .then(function (countPost) {
                        let totalPage = Math.ceil(countPost[0][0].count / number_item) || 1;

                        res.frontend.render('archives', {
                            posts: result[0],
                            archives_date: year_ + ' ' + month_,
                            month: month_,
                            totalPage: totalPage,
                            currentPage: page,
                            baseURL: '/blog/posts/archives/' + year_ + '/' + month_ + '/page-{page}'
                        });
                    })
```
    
* SOLUTION: we need to change sql and sqlCount
    * In sql, users.user_url does not exist. There is no such column in our table. Also, change all 'created_at' to 'published_at'
    * In sqlCount, change all 'created_at' to 'published_at'

    ```sql

        let sql = "select posts.*, users.user_email, users.display_name, users.user_image_url, users.user_status" + 
        " from arr_post as posts left outer join arr_user as users on posts.created_by = users.id" + 
        " WHERE posts.type = 'post' AND posts.published = 1 AND EXTRACT(MONTH FROM posts.published_at) = "+ month_  + 
            " AND EXTRACT(YEAR FROM posts.published_at) = " + year_ + "ORDER BY posts.id DESC OFFSET " + (page - 1) * number_item + " LIMIT " + number_item;

        let sqlCount = "select count(*)" +
            " from arr_post as posts WHERE" +
            " posts.type = 'post' AND posts.published = 1 AND EXTRACT (MONTH FROM posts.published_at ) = " + month_ + 
            " AND EXTRACT (YEAR FROM posts.published_at) = " + year_;
    ```

    * Change render file to 'posts' and baseURL as below

    ```js
        res.frontend.render('posts', {
            posts: result[0],
            archives_date: year_ + ' ' + month_,
            month: month_,
            totalPage: totalPage,
            currentPage: page,
            baseURL: '/blog/posts/archives/' + year_ + '/' + month_ + '/page-'
        });
    ```