let localStorage = window.localStorage

module.exports = {

  // Define runtime page data attributes
  data: function () {
    return {
      'runtimeViewId': null,
      'runtimeUrl': null,
      'runtimeTabs': null,
      'runtimeActiveTab': null,
      'runtimeScrollPosition': 0
    }
  },

  mounted: function () {
    // Framework7 routed page
    if (this.$route) {
      // Firebase shortlinks
      this.user = this.$root.user
      this.db = this.$root.db
      this.store = this.$root.store
      this.timestamp = this.$root.timestamp

      // Shortlinks to functions
      this.sortObject = this.$root.sortObject

      // Save view id and url in page data
      this.runtimeViewId = this.$$(this.$el).parents('.view').attr('id')
      this.runtimeUrl = this.$route.url

      // Get initial state
      let initialState = localStorage['page:' + this.runtimeViewId + '/' + this.runtimeUrl] ? JSON.parse(localStorage['page:' + this.runtimeViewId + '/' + this.runtimeUrl]) : null

      // Get tabs
      this.$$(this.$el).find('.tab.page-content').each(function (i, tabEl) {
        if (!this.runtimeTabs) {
          this.runtimeTabs = {}
        }
        let tabId = this.$$(tabEl).attr('id')
        if (tabId !== null && tabId !== '' && this.runtimeTabs[tabId] === undefined) {
          this.runtimeTabs[tabId] = 0
        } else {
          console.error('Please assign a unique "id" attribute to each tab component on page "' + this.runtimeUrl + '"!')
        }
        if (this.$$(tabEl).hasClass('active')) {
          this.runtimeActiveTab = tabId
        }
        this.$forceUpdate()
      }.bind(this))

      // Attach tab listener
      if (this.runtimeTabs) {
        this.$$(this.$el).on('tab:show', function (eTab) {
          this.runtimeActiveTab = this.$$(eTab.target).attr('id')
          this.$forceUpdate()
        }.bind(this))
      }

      // Attach scroll position listener
      if (!this.runtimeTabs) {
        this.$$(this.$el).find('.page-content').on('scroll', function (ePageContent) {
          this.runtimeScrollPosition = ePageContent.target.scrollTop
          this.$forceUpdate()
        }.bind(this))
      } else {
        for (let tab in this.runtimeTabs) {
          this.$$(this.$el).find('.tab.page-content#' + tab).on('scroll', function (ePageContent) {
            this.runtimeTabs[tab] = ePageContent.target.scrollTop
            this.$forceUpdate()
          }.bind(this))
        }
      }

      // Restore initial state
      if (initialState) {
        // Data
        for (let key in initialState) {
          if (key.substr(0, 7) !== 'runtime') {
            this[key] = initialState[key]
          }
        }

        // Tabs, scroll positions
        if (initialState.runtimeTabs) {
          setTimeout(function () {
            this.$f7.showTab('.tab#' + initialState.runtimeActiveTab, false)
          }.bind(this), 0)
          for (let tab in initialState.runtimeTabs) {
            setTimeout(function () {
              this.$$(this.$el).find('.tab#' + tab).scrollTop(initialState.runtimeTabs[tab])
            }.bind(this), 0)
          }
        } else {
          this.$$(this.$el).find('.page-content').scrollTop(initialState.runtimeScrollPosition)
        }
      }
    }
  },

  // Update page data in local storage on change
  beforeUpdate: function () {
    if (this.runtimeUrl) {
      localStorage['page:' + this.runtimeViewId + '/' + this.runtimeUrl] = JSON.stringify(this.$data)
    }
  }

}
