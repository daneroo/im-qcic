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
      color: theme.palette.primary[500], // blue for now
      textDecoration: 'none'
    },
    'a:hover': {
      color: theme.palette.common.black
    },

    // header links (Top menu)
    header: {
      // 'margin-bottom': '25px'
      marginBottom: 25
    },
    'header a': {
      color: theme.palette.grey[500], // #9e9e9e
      // color: theme.palette.shades.light.text.disabled, // similar
      fontSize: 14,
      marginRight: 15
    },
    'header a.is-active': {
      color: theme.palette.common.black,
    },
    'header a:hover': {
      color: theme.palette.common.black,
    },

    // for about page but applies to all pages
    // 'p,li': {
    article: {
      margin: [0, 'auto'],
      maxWidth: 650
    },
    // 'article p': theme.typography.body1,
    'article p': {
      color: theme.palette.grey[700], // #616161
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
