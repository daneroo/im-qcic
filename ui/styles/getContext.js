// @flow weak
/* eslint-disable no-underscore-dangle */

import { create, SheetsRegistry } from 'jss';
import preset from 'jss-preset-default';
import { createMuiTheme } from 'material-ui/styles';
import purple from 'material-ui/colors/purple';
import green from 'material-ui/colors/green';
import createGenerateClassName from 'material-ui/styles/createGenerateClassName';

const theme = createMuiTheme({
  palette: {
    // you can override othere theme variable here. https://material-ui-next.com/customization/themes/#themes
    // background: {default:'white'},
    primary: purple,
    secondary: green,
  },
});

// Configure JSS
const jss = create(preset());
jss.options.createGenerateClassName = createGenerateClassName;

function createContext() {
  return {
    jss,
    theme,
    // This is needed in order to deduplicate the injection of CSS in the page.
    sheetsManager: new Map(),
    // This is needed in order to inject the critical CSS.
    sheetsRegistry: new SheetsRegistry(),
  };
}

export default function getContext() {
  // Make sure to create a new store for every server-side request so that data
  // isn't shared between connections (which would be bad)
  if (!process.browser) {
    return createContext();
  }

  // Reuse context on the client-side
  if (!global.__INIT_MATERIAL_UI__) {
    global.__INIT_MATERIAL_UI__ = createContext();
  }

  return global.__INIT_MATERIAL_UI__;
}
