/* eslint-disable flowtype/require-valid-file-annotation */

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import Page from '../components/Page'
import Header from '../components/Header'


import Button from 'material-ui/Button';
import Dialog, {
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from 'material-ui/Dialog';
import Typography from 'material-ui/Typography';
import { withStyles } from 'material-ui/styles';
import withRoot from '../components/withRoot';

const styles = {
  root: {
    textAlign: 'center',
    paddingTop: 100,
  },
};

class Index extends Component {
  state = {
    open: false,
  };

  handleRequestClose = () => {
    this.setState({
      open: false,
    });
  };

  handleClick = () => {
    this.setState({
      open: true,
    });
  };

  render() {
    return (
      <Page>
        <Header pathname={this.props.url.pathname} />
        <div className={this.props.classes.root}>
          <Dialog open={this.state.open} onRequestClose={this.handleRequestClose}>
            <DialogTitle>Super Secret Password</DialogTitle>
            <DialogContent>
              <DialogContentText>1-2-3-4-5</DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button color="primary" onClick={this.handleRequestClose}>
                OK
            </Button>
            </DialogActions>
          </Dialog>
          <Typography type="display1" gutterBottom>
            Material-UI
        </Typography>
          <Typography type="subheading" gutterBottom>
            example project
        </Typography>
          <Button raised color="accent" onClick={this.handleClick}>
            Super Secret Password
        </Button>
        </div>
      </Page>
    );
  }
}

Index.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(Index)
