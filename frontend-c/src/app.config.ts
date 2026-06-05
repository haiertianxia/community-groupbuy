{
  "pages": [
    "pages/index/index",
    "pages/category/category",
    "pages/cart/cart",
    "pages/order/order",
    "pages/user/user",
    "pages/product/product",
    "pages/activity/activity",
    "pages/checkout/checkout",
    "pages/address/address",
    "pages/address/edit/edit",
    "pages/login/login",
    "pages/leader/leader",
    "pages/settings/settings",
    "pages/help/help"
  ],
  "window": {
    "backgroundTextStyle": "light",
    "navigationBarBackgroundColor": "#ff6b35",
    "navigationBarTitleText": "社区团购",
    "navigationBarTextStyle": "white"
  },
  "tabBar": {
    "color": "#999999",
    "selectedColor": "#ff6b35",
    "backgroundColor": "#ffffff",
    "borderStyle": "black",
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "首页",
        "iconPath": "assets/tab/home.png",
        "selectedIconPath": "assets/tab/home-active.png"
      },
      {
        "pagePath": "pages/category/category",
        "text": "分类",
        "iconPath": "assets/tab/category.png",
        "selectedIconPath": "assets/tab/category-active.png"
      },
      {
        "pagePath": "pages/cart/cart",
        "text": "购物车",
        "iconPath": "assets/tab/cart.png",
        "selectedIconPath": "assets/tab/cart-active.png"
      },
      {
        "pagePath": "pages/order/order",
        "text": "订单",
        "iconPath": "assets/tab/order.png",
        "selectedIconPath": "assets/tab/order-active.png"
      },
      {
        "pagePath": "pages/user/user",
        "text": "我的",
        "iconPath": "assets/tab/user.png",
        "selectedIconPath": "assets/tab/user-active.png"
      }
    ]
  },
  "permission": {
    "scope.userLocation": {
      "desc": "获取您的位置信息以便推荐附近团长"
    }
  },
  "requiredPrivateInfos": ["getLocation"]
}