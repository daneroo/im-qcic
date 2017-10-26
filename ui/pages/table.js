/* eslint-disable flowtype/require-valid-file-annotation */

import React, { Component } from 'react';
import { withStyles } from 'material-ui/styles';
import Page from '../components/Page'
import Header from '../components/Header'
import BasicTable from '../components/BasicTable';
import withRoot from '../components/withRoot';

class Table extends Component {
  render() {
    return (
      <Page>
        <Header pathname={this.props.url.pathname} />
        <BasicTable />
      </Page>
    );
  }
}

export default Table;
