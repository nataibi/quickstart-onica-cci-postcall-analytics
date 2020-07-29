import React, {Component} from 'react';
import {Auth, Hub} from 'aws-amplify';
import history from "../history";

class CognitoAuth extends Component {
  constructor(props) {
    super(props);

    // let the Hub module listen on Auth events
    Hub.listen('auth', (data) => {
      switch (data.payload.event) {
        case 'signIn':
          history.push('/calls');
          this.setState({authState: 'signedIn', authData: data.payload.data});
          break;
        case 'signIn_failure':
          break;
        default:
          break;
      }
    });
  }

  componentDidMount() {
    // we only want to do this if code isn't
    if (!this.props.location || !this.props.location.search.startsWith("?code=")) {
      Auth.currentAuthenticatedUser().then(user => {
        history.push('/calls');
      }).catch(e => {
        Auth.federatedSignIn();
      });
    }
  }

  render() {
    return (
        <div className="App"/>
    );
  }
}

export default CognitoAuth;