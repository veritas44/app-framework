// Load application configuration
var app = require(process.env.APP_ROOT_FROM_SCRIPTS + 'package.json')

// Shortlink to local storage
var localStorage = window.localStorage

// Reset local storage after App Framework version change
if (process.env.RESET_LOCAL_STORAGE === 'true' &&
    (!window.localStorage['app-framework-version'] || window.localStorage['app-framework-version'] !== process.env.FRAMEWORK_VERSION)) {
  window.localStorage.clear()
  window.localStorage['app-framework-version'] = process.env.FRAMEWORK_VERSION
}

// Import underscore
window['_'] = require('underscore')

// Import Vue
var Vue = require('vue')

// Import Framework7
require('../libs/framework7/js/framework7.min.js')
if (process.env.THEME === 'material') {
  require('../libs/framework7/css/framework7.material.min.css')
  require('../libs/framework7/css/framework7.material.colors.min.css')
} else {
  require('../libs/framework7/css/framework7.ios.min.css')
  require('../libs/framework7/css/framework7.ios.colors.min.css')
}

// Init Framework7 Vue Plugin
Vue.use(require('../libs/framework7-vue.min.js'))

// Import icon fonts
if (process.env.FONT_FRAMEWORK7 === 'true') {
  require('../libs/framework7-icons/css/framework7-icons.css')
}
if (process.env.FONT_MATERIAL === 'true') {
  require('../libs/material-icons/css/material-icons.css')
}
if (process.env.FONT_ION === 'true') {
  require('../libs/ion-icons/css/ion-icons.css')
}
if (process.env.FONT_AWESOME === 'true') {
  require('../libs/font-awesome-icons/css/fontAwesome-icons.css')
}

// Import iNoBounce
require('inobounce')

// Import main css
require('../main.css')

// Load special routes from config
var Routes = []
for (let p = 0; p < app.specialRoutes.length; p++) {
  let page = app.specialRoutes[p].substr(0, app.specialRoutes[p].indexOf('/'))
  Routes.push({
    path: app.specialRoutes[p],
    component: require(process.env.APP_ROOT_FROM_SCRIPTS + 'pages/' + page + '.vue')
  })
}

// Load all pages as standard route
let pages = process.env.PAGES
pages = pages.split(',')
for (let p = 0; p < pages.length; p++) {
  if (Routes[pages[p]] === undefined) {
    Routes.push({path: pages[p], component: require(process.env.APP_ROOT_FROM_SCRIPTS + 'pages/' + pages[p] + '.vue')})
  }
}

// Import mixin for page runtime management
Vue.mixin(require('./mixin-page.js'))

// Language patterns
var text = {
  en: {
    modalButtonOk: 'OK',
    modalButtonCancel: 'Cancel',
    modalPreloaderTitle: 'Loading... ',
    modalUsernamePlaceholder: 'Username',
    modalPasswordPlaceholder: 'Password',
    smartSelectBackText: 'Back',
    smartSelectPopupCloseText: 'Close',
    smartSelectPickerCloseText: 'Done',
    notificationCloseButtonText: 'Close'
  },
  de: {
    modalButtonOk: 'OK',
    modalButtonCancel: 'Abbrechen',
    modalPreloaderTitle: 'Lädt... ',
    modalUsernamePlaceholder: 'Benutzername',
    modalPasswordPlaceholder: 'Passwort',
    smartSelectBackText: 'Zurück',
    smartSelectPopupCloseText: 'Fertig',
    smartSelectPickerCloseText: 'Fertig',
    notificationCloseButtonText: 'OK'
  }
}

// Init App
new Vue({ // eslint-disable-line
  el: '#app',
  template: '<app/>',
  data: {
    language: localStorage.language ? localStorage.language : app.defaultLanguage,
    title: app.title,
    version: app.version,
    config: app,
    user: null,
    db: null,
    store: null,
    timestamp: null,
    sortObject: require('./sort-object.js')
  },
  framework7: {
    root: '#app',
    routes: Routes,
    material: process.env.THEME === 'material',
    modalTitle: app.title
  },
  components: {
    app: require(process.env.APP_ROOT_FROM_SCRIPTS + 'app.vue')
  },
  mounted: function () {
    // Mount Firebase with shortlinks
    if (process.env.USE_DATABASE === 'true' || process.env.USE_STORAGE === 'true') {
      // Import Firebase
      var firebase = require('firebase')
      // Init Firebase
      firebase.initializeApp(app.firebase)
      // User data from cache
      this.user = localStorage.user ? JSON.parse(localStorage.user) : null
      // Monitor user changes
      firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
          this.user = {
            uid: user.uid,
            email: user.email
          }
          localStorage.user = JSON.stringify(this.user)
        } else {
          this.user = null
          localStorage.removeItem('user')
        }
      }.bind(this))
      // Database shortlink
      if (process.env.USE_DATABASE === 'true') {
        this.db = function (path) {
          return firebase.database().ref(path)
        }
      }
      // Storage shortlink
      if (process.env.USE_STORAGE === 'true') {
        this.store = function (path) {
          return firebase.storage().ref(path)
        }
      }
      // Timestamp
      this.timestamp = firebase.database.ServerValue.TIMESTAMP
    }

    // Update text patterns
    this.updateTextPatterns()

    /*
    // Get views and load state
    console.log(this.$f7.views)

    this.$$(document).on('page:init page:reinit', function (ePage) {
      console.log(JSON.stringify(this.$f7.views[2].history))
    }.bind(this))
    */

    // Copy initial

    // Get views
    window.views = {}
    let viewsToRestore = {}
    this.$$('.view').each(function (viewNo, viewEl) {
      let viewId = this.$$(viewEl).attr('id')
      if (viewId !== null && viewId !== '' && window.views[viewId] === undefined) {
        window.views[viewId] = {no: viewNo, pages: []}
        viewsToRestore[viewId] = localStorage['view:' + viewId] ? JSON.parse(localStorage['view:' + viewId]) : null
      } else {
        console.error('Please assign an unique ID attribute for each view component!')
      }
    }.bind(this))

    // Remember history
    this.$$(document).on('page:init page:reinit', function (ePage) {
      if (ePage.detail.page.url.substr(0, 9) !== '#content-' && (!ePage.detail.page.fromPage || ePage.detail.page.fromPage.url.substr(0, 9) !== '#content-')) {
        let viewId = this.$$(ePage.target).parents('.view').attr('id')
        if (window.views[viewId]) {
          // Forward
          if (ePage.type === 'page:init') {
            window.views[viewId].pages.push(ePage.detail.page.url)
          // Backward
          } else {
            window.views[viewId].pages.pop()
          }
          // Update local storage
          localStorage['view:' + viewId] = JSON.stringify(window.views[viewId])
        }
      }
    }.bind(this))

    // Restore history
    for (let v in viewsToRestore) {
      if (viewsToRestore[v]) {
        for (let p = 1; p < viewsToRestore[v].pages.length; p++) {
          setTimeout(function () {
            this.$f7.views[viewsToRestore[v].no].router.load({url: viewsToRestore[v].pages[p], animatePages: false})
          }.bind(this), 0)
        }
      }
    }

    /*
    // Restore state

    // Get views and ad saved state
    window.views = {}
    this.$$('.view').each(function (i, viewEl) {
      let viewId = this.$$(viewEl).attr('id')
      window.views[viewId] = localStorage['view:' + viewId] ? JSON.parse(localStorage['view:' + viewId]) : []
      // Restore pages

    }.bind(this))

    // On each new page load
    this.$$(document).on('page:init', function (pageEv) {
      let url = pageEv.detail.page.url
      let realPage = url !== '#content-2'
      // On each real page load
      if (realPage) {
        let viewId = this.$$(pageEv.target).parents('.view').attr('id')
        // Restore saved state
        if (localStorage['page:' + viewId + '/' + url]) {
          // todo ...
        }
        // Remember state changes
        // todo ...
      }
    }.bind(this))

    console.log(window.views)
    */

    // Set phone frame

      // Update phone frame function
    var updatePhoneFrame = function () {
          // Show frame on desktop
      if (app.showPhoneFrameOnDesktop && !this.$f7.device.os) {
        // Adjust web look to phone look
        this.$$('html').addClass('pixel-ratio-2')
        this.$$('html').addClass('ios-gt-8')

        // Show frame
        if (window.innerWidth > 370 && window.innerHeight > 778) {
          this.$$('#frame').addClass('phone')
          this.$$('#frame').removeClass('limitWidth')
          this.$$('#frame').removeClass('limitHeight')
          this.$$('body').removeClass('bodyDark')

            // Limit width and height
        } else if (window.innerWidth > 320 && window.innerHeight > 568) {
          this.$$('#frame').removeClass('phone')
          this.$$('#frame').addClass('limitWidth')
          this.$$('#frame').addClass('limitHeight')
          this.$$('body').addClass('bodyDark')

            // Limit width
        } else if (window.innerWidth > 320) {
          this.$$('#frame').removeClass('phone')
          this.$$('#frame').addClass('limitWidth')
          this.$$('#frame').removeClass('limitHeight')
          this.$$('body').addClass('bodyDark')

            // Limit height
        } else if (window.innerHeight > 568) {
          this.$$('#frame').removeClass('phone')
          this.$$('#frame').removeClass('limitWidth')
          this.$$('#frame').addClass('limitHeight')
          this.$$('body').addClass('bodyDark')

            // No limitation
        } else {
          this.$$('#frame').removeClass('phone')
          this.$$('#frame').removeClass('limitWidth')
          this.$$('#frame').removeClass('limitHeight')
          this.$$('body').removeClass('bodyDark')
        }
      }

      // Resize navbars
      /*
      setTimeout(function () {
        let views = JSON.parse(localStorage.views)
        for (let view in views) {
          this.$f7.sizeNavbars('#' + view)
        }
      }.bind(this), 0)
      */
    }.bind(this)

      // Resize initially
    updatePhoneFrame()

      // Resize again on windows resize
    this.$$(window).resize(updatePhoneFrame)

    // Remember panel
    this.$$(document).on('panel:opened panel:closed', function (ePanel) {
      if (ePanel.type === 'panel:opened') {
        localStorage.panel = /left/.test(ePanel.path[0]._prevClass) ? 'left' : 'right'
      } else {
        localStorage.removeItem('panel')
      }
    })

    // Remember popup
    this.$$(document).on('popup:opened popup:closed', function (ePopup) {
      if (ePopup.type === 'popup:opened') {
        localStorage.popup = this.$$(ePopup.target).attr('id')
      } else {
        localStorage.removeItem('popup')
      }
    }.bind(this))

    // Remember loginScreen
    this.$$(document).on('loginscreen:opened loginscreen:closed', function (eLoginScreen) {
      if (eLoginScreen.type === 'loginscreen:opened') {
        localStorage.loginScreen = this.$$(eLoginScreen.target).attr('id')
      } else {
        localStorage.removeItem('loginScreen')
      }
    }.bind(this))

    // Remember form focus
    this.$$(document).on('focusin focusout', function (eFocus) {
      let focusId = this.$$(eFocus.target).attr('name')
      if (eFocus.type === 'focusin' && focusId !== null && focusId !== '') {
        localStorage.formFocus = focusId
      } else {
        localStorage.removeItem('formFocus')
      }
    }.bind(this))

    // Restore pages
    if (localStorage.views) {
      let views = JSON.parse(localStorage.views)
      localStorage.removeItem('views')
      this.$$('.view').each(function (viewNo, viewEl) {
        let viewId = this.$$(viewEl).attr('id')
        for (let pageNo in views[viewId]) {
          setTimeout(function () {
            this.$f7.views[viewNo].router.load({
              url: views[viewId][pageNo].url,
              animatePages: false
            })
          }.bind(this), 0)
        }
      }.bind(this))
    }

    // Restore panel, popup, login screen, form focus
    setTimeout(function () {
      if (localStorage.panel) {
        this.$f7.openPanel(localStorage.panel, false)
      }
      if (localStorage.popup) {
        this.$f7.popup('#' + localStorage.popup, false, false)
      }
      if (localStorage.loginScreen) {
        this.$f7.loginScreen('#' + localStorage.loginScreen, false)
      }
      /*
      if (localStorage.formFocus) {
        setTimeout(function () {
          let elType = this.$$(this.$f7.getCurrentView().activePage.container).find('[name=' + localStorage.formFocus + ']')[0].tagName
          if (elType === 'INPUT') {
            let val = this.$$(this.$f7.getCurrentView().activePage.container).find('[name=' + localStorage.formFocus + ']').val()
            this.$$(this.$f7.getCurrentView().activePage.container).find('[name=' + localStorage.formFocus + ']').val('')
            this.$$(this.$f7.getCurrentView().activePage.container).find('[name=' + localStorage.formFocus + ']').focus()
            this.$$(this.$f7.getCurrentView().activePage.container).find('[name=' + localStorage.formFocus + ']').val(val)
          } else {
            this.$$(this.$f7.getCurrentView().activePage.container).find('[name=' + localStorage.formFocus + ']').focus()
          }
        }.bind(this), 0)
      }
      */
    }.bind(this), 0)

    // Show app
    setTimeout(function () {
      this.$$('.framework7-root').css('visibility', 'visible')
    }.bind(this), 0)
  },
  methods: {
    updateTextPatterns: function () {
      let patterns = text[this.language] ? text[this.language] : text['en']
      for (let p in patterns) {
        this.$f7.params[p] = patterns[p]
      }
    }
  },
  watch: {
    language: function (newLanguage) {
      localStorage.language = newLanguage
      this.updateTextPatterns()
    }
  }
})
