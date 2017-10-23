/* eslint-disable flowtype/require-valid-file-annotation */

import React, { Component } from 'react';
import { withStyles } from 'material-ui/styles';
import BasicTable from '../components/BasicTable';
import withRoot from '../components/withRoot';

const styles = {
  root: {
    textAlign: 'center',
    paddingTop: 200,
  },
};

class Table extends Component {
  render() {
    return (
      <BasicTable />
    );
  }
}

export default withRoot(withStyles(styles)(Table));
