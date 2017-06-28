'use strict';

module.exports = function (controller, component, application) {

  controller.settingWidget = function (widget) {
    // Get all widget layouts
    let layouts = component.getLayouts(widget.widget_name);

    // Create setting form
    let form = new ArrowHelper.WidgetForm(widget);
    form.addText('title', 'Title');
    form.addText('number_of_published_months', 'Number of Published Months');
    form.addCheckbox('display_published_months', 'Display');
    form.addSelect('layout', 'Layout', layouts);

    return new Promise(function (fullfill, reject) {
      fullfill(form.render());
    })
  };

  controller.renderWidget = function (widget) {
    // Get layouts
    let layout;
    try {
      layout = JSON.parse(widget.data).layout;
    } catch (err) {
      layout = component.getLayouts(widget.widget_name)[0];
    }
    
    let limit = JSON.parse(widget.data).number_of_published_months || 5;

    // Get published_time
    if (JSON.parse(widget.data).display_published_months == 1) {
      // get published_months and their corresponding number of posts
      return application.feature.blog.actions.groupByPublishedMonth(limit)
        .then(function (published_time) {
        // console.log(published_time);
        // published_time: each row consists of published_month, published_year & count
        // Render view with layout
        return component.render(layout, {
          widget: JSON.parse(widget.data),
          published_time: published_time
        })
      });
    }
  };
};

