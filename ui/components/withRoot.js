/* eslint-disable flowtype/require-valid-file-annotation */

import React, { Component } from 'react';
import { withStyles, MuiThemeProvider } from 'material-ui/styles';
import wrapDisplayName from 'recompose/wrapDisplayName';
import getContext from '../styles/getContext';

// Apply some reset
const styles = theme => ({
  '@global': {
    html: {
      background: theme.palette.background.default,
      WebkitFontSmoothing: 'antialiased', // Antialiasing.
      MozOsxFontSmoothing: 'grayscale', // Antialiasing.
    },
    body: {
      // 'font-family': "'Roboto', sans-serif",
      fontFamily: ['Roboto', 'sans-serif'],
      margin: 0,
      padding: '25px 50px;'
    },
    a: {
      color: '#067df7', // TODO(daneroo): blue, get from theme!
      textDecoration: 'none'
    },
    'a:hover': {
      color: '#000000'
    },

    // header links (Top menu)
    header: {
      // 'margin-bottom': '25px'
      marginBottom: 25
    },
    'header a': {
      color: '#999999', // TODO(daneroo): grey, get from theme!
      fontSize: 14,
      marginRight: 15
    },
    'header a.is-active': {
      color: '#000000',
    },
    'header a:hover': {
      color: '#000000',
    },

    // for about page but applies to all pages
    // 'p,li': {
    article: {
      margin: [0, 'auto'],
      maxWidth: 650
    },
    'article p': {
      color: '#666666', // TODO(daneroo): light grey, get from theme! '#888888'
      fontSize: 14,
      lineHeight: '24px' // must have units
    }
  }
});

let AppWrapper = props => props.children;

AppWrapper = withStyles(styles)(AppWrapper);

function withRoot(BaseComponent) {
  class WithRoot extends Component {
    static getInitialProps(ctx) {
      if (BaseComponent.getInitialProps) {
        return BaseComponent.getInitialProps(ctx);
      }

      return {};
    }

    componentWillMount() {
      this.styleContext = getContext();
    }

    componentDidMount() {
      // Remove the server-side injected CSS.
      const jssStyles = document.querySelector('#jss-server-side');
      console.log('jssStyles', jssStyles)
      if (jssStyles && jssStyles.parentNode) {
        jssStyles.parentNode.removeChild(jssStyles);
      }
    }

    render() {
      return (
        <MuiThemeProvider
          theme={this.styleContext.theme}
          sheetsManager={this.styleContext.sheetsManager}
        >
          <AppWrapper>
            <BaseComponent {...this.props} />
          </AppWrapper>
        </MuiThemeProvider>
      );
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    WithRoot.displayName = wrapDisplayName(BaseComponent, 'withRoot');
  }

  return WithRoot;
}

export default withRoot;
