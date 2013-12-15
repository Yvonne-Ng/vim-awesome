/** @jsx React.DOM */
(function() {
"use strict";

// TODO(david): We might want to split up this file eventually.

var D_KEYCODE = 'D'.charCodeAt(),
    G_KEYCODE = 'G'.charCodeAt(),
    J_KEYCODE = 'J'.charCodeAt(),
    K_KEYCODE = 'K'.charCodeAt(),
    U_KEYCODE = 'U'.charCodeAt(),
    ENTER_KEYCODE = 13;

// A cache of all tag IDs and their counts.
var allTags = {};

var clamp = function(num, min, max) {
  return Math.min(Math.max(num, min), max);
};

var capitalizeFirstLetter = function(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

var scrollToNode = function(domNode) {
  var windowTop = $(window).scrollTop();
  var windowBottom = $(window).height() + windowTop;
  var elementTop = $(domNode).offset().top;
  var elementBottom = elementTop + $(domNode).height();

  if (elementBottom > windowBottom) {
    domNode.scrollIntoView(false /* alignWithTop */);
  } else if (elementTop < windowTop) {
    domNode.scrollIntoView(true /* alignWithTop */);
  }
};

var Sidebar = React.createClass({
  render: function() {
    var categories = _.map([
      "Language",
      "Syntax",
      "Navigation",
      "Movement",
      "Buffer",
      "Info",
      "Integrations"
    ], function(category) {
      return <li key={category}>
        <a href="#/blah"><i className="icon-fighter-jet"></i> {category}</a>
      </li>;
    });

    return <div className="sidebar">
      <h1 className="title">
        <a href="/">
          <span className="vim">Vim</span>Awesome
        </a>
      </h1>
      <div className="tac">
        <div className="subtitle">
          <div className="line1">Awesome Vim plugins</div>
          <div className="from">from</div>
          <div className="line2">across the Universe</div>
        </div>
      </div>
      <ul className="categories">{categories}</ul>
    </div>;
  }
});

var SearchBox = React.createClass({
  componentDidMount: function() {
    window.addEventListener("keyup", this.windowKeyUp, false);
  },

  componentWillUnmount: function() {
    window.removeEventListener("keyup", this.windowKeyUp, false);
  },

  windowKeyUp: function(e) {
    var tag = e.target.tagName;
    var key = e.keyCode;
    if (tag !== "INPUT" && tag !== "TEXTAREA" &&
        key === 191 /* forward slash */) {
      this.refs.input.getDOMNode().focus();
    }
  },

  handleKeyUp: function(e) {
    var input = this.refs.input.getDOMNode();

    if (e.nativeEvent.keyCode === 27 /* escape */) {
      input.blur();
    } else {
      this.props.onInput(input.value);
    }
  },

  render: function() {
    return <div className="search-container">
      <i className="icon-search"></i>
      <input type="text" className="search" placeholder="Search" ref="input"
        onKeyUp={this.handleKeyUp} />
    </div>;
  }
});

var Plugin = React.createClass({
  goToDetailsPage: function() {
    Backbone.history.navigate("plugin/" + this.props.plugin.name, true);
  },

  render: function() {
    // TODO(david): Animations on initial render
    var plugin = this.props.plugin;
    if (!plugin || !plugin.name) return <li className="plugin"></li>;

    var hasNavFocus = this.props.hasNavFocus;
    // TODO(david): Map color from tag/category or just hash of name
    var color = "accent-" + (plugin.name.charCodeAt(0) % 9);
    return <li
        className={"plugin" + (hasNavFocus ? " nav-focus" : "")}
        onMouseEnter={this.props.onMouseEnter}>
      <a href={"plugin/" + plugin.name}>
        <div className="hover-bg"></div>
        <h3 className={"plugin-name " + color}>{plugin.name}</h3>
        {plugin.author && <span className="by">by</span>}
        {plugin.author && <span className="author">{" " + plugin.author}</span>}
        {plugin.github_stars > 0 && <div className="github-stars">
          {plugin.github_stars} <i className="icon-star"></i>
        </div>}
        <p className="short-desc">{plugin.short_desc}</p>
      </a>
    </li>;
  }
});

var PluginList = React.createClass({
  getInitialState: function() {
    return {
      plugins: [],
      selectedIndex: -1,
      hoverDisabled: false
    };
  },

  componentDidMount: function() {
    this.fetchPlugins(this.props.searchQuery);
    window.addEventListener("keydown", this.onWindowKeyDown, false);
  },

  componentDidUpdate: function(prevProps) {
    if (prevProps.searchQuery !== this.props.searchQuery) {
      this.fetchPlugins(this.props.searchQuery);
    }

    // Scroll to the navigated plugin if available
    if (this.refs.navFocus) {
      scrollToNode(this.refs.navFocus.getDOMNode());
    }
  },

  componentWillUnmount: function() {
    window.removeEventListener("keydown", this.onWindowKeyDown, false);
  },

  resetSelection: function() {
    if (this.state.selectedIndex !== -1) {
      this.setState({selectedIndex: -1});
    }
  },

  onWindowKeyDown: function(e) {
    // TODO(david): Duplicated code from SearchBox
    var tag = e.target.tagName;
    var key = e.keyCode;

    if (tag !== "INPUT" && tag !== "TEXTAREA") {
      if (key === J_KEYCODE || key === K_KEYCODE) {
        // Go to next or previous plugin
        var direction = (key === J_KEYCODE ? 1 : -1);
        var maxIndex = this.state.plugins.length - 1;
        var newIndex = clamp(this.state.selectedIndex + direction, 0, maxIndex);

        // Disable hover when navigating plugins, because when the screen scrolls,
        // a MouseEnter event will be fired if the mouse is over a plugin, causing
        // the selection to jump back.
        this.setState({selectedIndex: newIndex, hoverDisabled: true});

        // Re-enable hover after a delay
        clearTimeout(this.reenableHoverTimeout);
        this.reenableHoverTimeout = setTimeout(function() {
          this.setState({hoverDisabled: false});
        }.bind(this), 100);

      } else if (key === ENTER_KEYCODE && this.refs.navFocus) {
        e.preventDefault();
        this.refs.navFocus.goToDetailsPage();
      }
    }
  },

  onPluginMouseEnter: function(index, e) {
    // TODO(david): This is not as quick/snappy as CSS :hover ...
    if (this.state.hoverDisabled) return;
    this.setState({selectedIndex: index});
  },

  fetchPlugins: function(query) {
    $.ajax({
      url: "/api/plugins",
      dataType: "json",
      data: {query: query},
      success: function(data) {
        if (query === this.props.searchQuery) {
          this.setState({plugins: data});
        }
      }.bind(this)
    });
  },

  render: function() {
    var query = this.props.searchQuery.toLowerCase();
    var plugins = _.chain(this.state.plugins)
      .sortBy("vimorg_rating")
      .sortBy("github_stars")
      .reverse()
      .map(function(plugin, index) {
        var hasNavFocus = (index === this.state.selectedIndex);
        return <Plugin
            ref={hasNavFocus ? "navFocus" : ""}
            key={plugin.id}
            hasNavFocus={hasNavFocus}
            plugin={plugin}
            onMouseEnter={this.onPluginMouseEnter.bind(this, index)} />;
      }, this)
      .value();

    return <ul className="plugins">{plugins}</ul>;
  }
});

// Instructions for installing a plugin with Vundle.
var VundleInstructions = React.createClass({
  render: function() {
    var urlPath = (this.props.github_url || "").replace(
        /^https?:\/\/github.com\//, "");
    var vundleUri = urlPath.replace(/^vim-scripts\//, "");

    return <div>
      <p>Place this in your <code>.vimrc:</code></p>
      <pre>Bundle '{vundleUri}'</pre>
      <p>&hellip; then run the following in Vim:</p>
      <pre>:source %<br/>:BundleInstall</pre>
      {/* Hack to get triple-click in Chrome to not over-select. */}
      <div>{'\u00a0' /* &nbsp; */}</div>
    </div>;
  }
});

// Instructions for installing a plugin with Pathogen.
var PathogenInstructions = React.createClass({
  render: function() {
    return <div>
      <p>Run the following in a terminal:</p>
      <pre>cd ~/.vim/bundle<br/>git clone {this.props.github_url}
      </pre>
      {/* Hack to get triple-click in Chrome to not over-select. */}
      <div>{'\u00a0' /* &nbsp; */}</div>
    </div>;
  }
});

// Instructions for installing a plugin manually (downloading an archive).
var ManualInstructions = React.createClass({
  render: function() {
    return <div>
      TODO: How to install manually
    </div>;
  }
});

// Help text explaining what Vundle is and linking to more details.
var VundleTabPopover = React.createClass({
  render: function() {
    return <div>
      Vundle is short for Vim Bundle and is a plugin manager for Vim.
      <br/><br/>See
      <a href="https://github.com/gmarik/vundle" target="_blank">
        <i className="icon-github" /> gmarik/vundle
      </a>
    </div>;
  }
});

// Help text explaining what Pathogen is and linking to more details.
var PathogenTabPopover = React.createClass({
  render: function() {
    return <div>
      Pathogen makes it super easy to install plugins and runtime files
      in their own private directories.
      <br/><br/>See
      <a href="https://github.com/tpope/vim-pathogen" target="_blank">
        <i className="icon-github" /> tpope/vim-pathogen
      </a>
    </div>;
  }
});

// The installation instructions (via Vundle, etc.) widget on the details page.
var Install = React.createClass({
  getInitialState: function() {
    return {
      tabActive: "vundle"
    };
  },

  componentDidMount: function() {
    if (window.localStorage && window.localStorage["installTab"]) {
      this.setState({tabActive: window.localStorage["installTab"]});
    }

    var popovers = {
      vundleTab: <VundleTabPopover />,
      pathogenTab: <PathogenTabPopover />
    };

    var self = this;
    _.each(popovers, function(component, ref) {
      React.renderComponentToString(component, function(markup) {
        var $tabElem = $(self.refs[ref].getDOMNode());
        $tabElem.popover({
          html: true,
          content: markup,
          placement: "left",
          animation: false,
          trigger: "hover",
          delay: 100,
          container: $tabElem
        });
      });
    });
  },

  onTabClick: function(installMethod) {
    this.setState({tabActive: installMethod});
    if (window.localStorage) {
      window.localStorage["installTab"] = installMethod;
    }
  },

  render: function() {
    return <div className="install row-fluid">
      <div className="tabs-column">
        <h3 className="install-label">Install from</h3>
        <ul className="install-tabs">
          <li onClick={this.onTabClick.bind(this, "vundle")} ref="vundleTab"
              className={this.state.tabActive === "vundle" ? "active" : ""}>
            Vundle
          </li>
          <li onClick={this.onTabClick.bind(this, "pathogen")} ref="pathogenTab"
              className={this.state.tabActive === "pathogen" ? "active" : ""}>
            Pathogen
          </li>
          <li onClick={this.onTabClick.bind(this, "manual")}
              className={this.state.tabActive === "manual" ? "active" : ""}>
            Archive
          </li>
        </ul>
      </div>
      <div className="content-column">
        {this.state.tabActive === "vundle" &&
            <VundleInstructions github_url={this.props.github_url} />}
        {this.state.tabActive === "pathogen" &&
            <PathogenInstructions github_url={this.props.github_url} />}
        {this.state.tabActive === "manual" && <ManualInstructions />}
      </div>
    </div>;
  }
});

// This is the tags widget on the details page.
var Tags = React.createClass({
  getInitialState: function() {
    return {
      isEditing: false
    };
  },

  componentDidMount: function() {
    this.fetchAllTags();
  },

  componentDidUpdate: function() {
    if (this.refs && this.refs.tagInput) {
      var $input = $(this.refs.tagInput.getDOMNode());
      $input.focus();
      this.initTypeahead($input);
    }
  },

  initTypeahead: function($input) {
    // Uses Bootstrap's lightweight typeahead:
    // http://getbootstrap.com/2.3.2/javascript.html#typeahead
    $input.typeahead({
      source: _.keys(allTags),

      sorter: function(items) {
        return _.sortBy(items, function(tagId) {
          return -allTags[tagId].count;
        });
      },

      highlighter: function(item) {
        var Typeahead = $.fn.typeahead.Constructor;
        var tagName = capitalizeFirstLetter(item);
        var highlighted = Typeahead.prototype.highlighter.call(this, tagName);
        return highlighted + "<span class=\"count\">&times; " +
            allTags[item].count + "</span>";
      },

      updater: function(item) {
        return capitalizeFirstLetter(item);
      }
    });
  },

  fetchAllTags: function() {
    if (!_.isEmpty(allTags)) return;

    $.getJSON("/api/tags", function(data) {
      allTags = {};
      _.each(data, function(tag) {
        allTags[tag.id] = tag;
      });
    });
  },

  onEditBtnClick: function() {
    this.setState({isEditing: true});
  },

  onDoneBtnClick: function() {
    this.setState({isEditing: false});
  },

  onRemoveBtnClick: function(tag, e) {
    this.props.onTagsChange(_.without(this.props.tags, tag));
  },

  onKeyUp: function(e) {
    var key = e.keyCode;
    if (key === 13 /* enter */ || key === 9 /* tab */ ||
        key === 188 /* comma */) {
      var $input = $(this.refs.tagInput.getDOMNode());
      // TODO(david): This needs to use autocomplete
      var tagId = $input.val().replace(/,$/, "").toLowerCase();
      if (!tagId) return;
      $input.val("");
      this.props.onTagsChange(this.props.tags.concat(tagId));
    }
  },

  render: function() {
    var MAX_TAGS = 5;

    var actionBtn;
    if (this.state.isEditing) {
      actionBtn = <button
          onClick={this.onDoneBtnClick} className="action-btn done-btn">
        <i className="icon-check"></i> Done
      </button>;
    } else {
      actionBtn = <button
          onClick={this.onEditBtnClick} className="action-btn edit-btn">
        <i className="icon-edit"></i> Edit
      </button>;
    }

    var tags = _.map(this.props.tags, function(tag) {
      // TODO(david): Should get tag name from map of tags that we send down.
      var tagName = capitalizeFirstLetter(tag);
      return <li key={tag} className="tag">
        <a className="tag-link" href={"/tags/" + tag}>{tagName}</a>
        <i onClick={this.onRemoveBtnClick.bind(this, tag)}
            className="icon-remove-sign remove-btn"></i>
      </li>;
    }.bind(this));

    // TODO(david): Tags should be colored appropriately
    return <div className={"tags" + (this.state.isEditing ? " editing" : "")}>
      <h3 className="tags-label">Tags</h3>
      <ul className="tags-list">{tags}</ul>
      {this.state.isEditing && this.props.tags.length < MAX_TAGS &&
          <input ref="tagInput" onKeyUp={this.onKeyUp} type="text"
             maxLength="12" className="tag-input" placeholder="Add tag" />}
      {actionBtn}
    </div>;
  }
});

// Permalink page with more details about a plugin.
var PluginPage = React.createClass({
  getInitialState: function() {
    return {
      // TODO(david): placeholders
      created_at: 1286809444,
      updated_at: 1371265409
    };
  },

  componentDidMount: function() {
    this.fetchPlugin();
    window.addEventListener("keydown", this.onWindowKeyDown, false);
  },

  componentWillUnmount: function() {
    window.removeEventListener("keydown", this.onWindowKeyDown, false);
  },

  fetchPlugin: function() {
    $.getJSON("/api/plugins/" + this.props.name, function(data) {
      this.setState(data);
    }.bind(this));
  },

  // TODO(david): Maybe use keypress?
  onWindowKeyDown: function(e) {
    var key = e.keyCode;
    var direction;
    var gPressed = (key === G_KEYCODE && !e.altKey && !e.ctrlKey &&
        !e.shiftKey && !e.metaKey);

    if (key === J_KEYCODE || key === K_KEYCODE) {
      // Scroll page in small increments with j/k.
      direction = (key === J_KEYCODE ? 1 : -1);
      window.scrollBy(0, direction * 100);
    } else if (key === U_KEYCODE || key === D_KEYCODE) {
      // Scroll page in large increments with u/d.
      direction = (key === D_KEYCODE ? 1 : -1);
      window.scrollBy(0, direction * 400);
    } else if (key === G_KEYCODE && e.shiftKey) {
      // Scroll to bottom of page with shift+G.
      window.scrollTo(0, $(document).height());
    } else if (this.gLastPressed && gPressed) {
      // Scroll to top of page with gg (or by holding down g (yes this is what
      // Vim does as well -- TIL)).
      window.scrollTo(0, 0);
    }

    this.gLastPressed = gPressed;
  },

  // TODO(david): Should we adopt the "handleTagsChange" naming convention?
  onTagsChange: function(tags) {
    var newTags = _.uniq(tags);
    this.setState({tags: newTags});
    $.ajax({
      url: "/api/plugins/" + this.props.name + "/tags",
      type: "POST",
      contentType: "application/json",
      dataType: "json",
      data: JSON.stringify({tags: newTags}),
      success: function(data) {
        this.setState({tags: data.tags})
      }.bind(this)
    });
  },

  render: function() {
    // TODO(david): Should only run markdown on readme.md, not generic long_desc
    var readmeHtml = marked(this.state.long_desc || "");
    // TODO(david): What to do for scripts that don't have a vim.org submission?
    var vimOrgUrl = "http://www.vim.org/scripts/script.php?script_id=" +
        encodeURIComponent(this.state.vim_script_id);

    return <div className="plugin-page">
      <Plugin plugin={this.state} />

      <div className="row-fluid">
        <div className="span9 accent-box dates">
          <div className="row-fluid">
            <div className="span6">
              <h3 className="date-label">Created</h3>
              <div className="date-value">
                {moment(this.state.created_at * 1000).fromNow()}
              </div>
            </div>
            <div className="span6">
              <h3 className="date-label">Updated</h3>
              <div className="date-value">
                {moment(this.state.updated_at * 1000).fromNow()}
              </div>
            </div>
          </div>
        </div>
        <div className="span3 accent-box links">
          <a href={vimOrgUrl} target="_blank" className="vim-link">
            <i className="vim-icon dark"></i>
            <i className="vim-icon light"></i>
            Vim.org
          </a>
          <a href={this.state.github_url} target="_blank" className="github-link">
            <i className="github-icon dark"></i>
            <i className="github-icon light"></i>
            GitHub
          </a>
        </div>
      </div>

      <div className="row-fluid">
        <div className="span9">
          <Install github_url={this.state.github_url} />
        </div>
        <div className="span3">
          <Tags tags={this.state.tags} onTagsChange={this.onTagsChange} />
        </div>
      </div>

      <div className="row-fluid">
        <div className="span12 long-desc"
            dangerouslySetInnerHTML={{__html: readmeHtml}}>
        </div>
      </div>

    </div>;
  }
});

var PluginListPage = React.createClass({
  getInitialState: function() {
    return {searchQuery: ""};
  },

  onSearchInput: function(query) {
    this.setState({searchQuery: query});
    this.refs.pluginList.resetSelection();
  },

  render: function() {
    return <div>
      <SearchBox onInput={this.onSearchInput} />
      <div className="keyboard-tips">
        Tip: use <code>/</code> to search and
        <code>ESC</code>, <code>j</code>, <code>k</code> to navigate
      </div>
      <PluginList ref="pluginList" searchQuery={this.state.searchQuery} />
    </div>;
  }
});

var Page = React.createClass({
  render: function() {
    return <div className="page-container">
      <Sidebar />
      <div className="content">
        {this.props.content}
      </div>
    </div>;
  }
});

// TODO(alpert): Get rid of Backbone?
var Router = Backbone.Router.extend({
  routes: {
    "": "home",
    "plugin/:name": "plugin"
  },

  _showPage: function(component) {
    React.renderComponent(<Page content={component} />, document.body);
  },

  home: function() {
    this._showPage(<PluginListPage />);
  },

  plugin: function(name) {
    this._showPage(<PluginPage name={name} />);
  }
});

new Router();
Backbone.history.start({pushState: true});

// Hijack internal nav links to use Backbone router to navigate between pages
// Adapted from https://gist.github.com/tbranyen/1142129
if (Backbone.history && Backbone.history._hasPushState) {
  $(document).on("click", "a", function(evt) {
    var href = $(this).attr("href");
    var protocol = this.protocol + "//";

    // Only hijack URL to use Backbone router if it's relative (internal link)
    // and not a hash fragment.
    if (href && href.substr(0, protocol.length) !== protocol &&
        href[0] !== '#') {
      evt.preventDefault();
      Backbone.history.navigate(href, true);

      // Scroll to top. Chrome has this weird issue where it will retain the
      // current scroll position, even if it's beyond the document's height.
      window.scrollTo(0, 0);
    }
  });
}

})();
