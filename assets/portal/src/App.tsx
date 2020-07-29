import React, {Component} from 'react';
import {
    Switch,
    Route,
    Redirect,
    Router
} from 'react-router-dom';
import {withStyles} from "@material-ui/core";
import Amplify from 'aws-amplify';

import history from "./history";
import CognitoAuth from './auth/CognitoAuth';
import Calls from "./calls/Calls";
import globalStyles from './theme/global.styles';
import Upload from './upload/Upload';

Amplify.configure({
    Auth: {
        region: process.env.REACT_APP_REGION,
        userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
        userPoolWebClientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
        oauth: {
            domain: process.env.REACT_APP_COGNITO_DOMAIN,
            scope: ['profile', 'openid'],
            redirectSignIn: process.env.REACT_APP_COGNITO_REDIRECT,
            redirectSignOut: process.env.REACT_APP_COGNITO_REDIRECT,
            responseType: 'code'
        }
    }
});

class App extends Component {
    render() {
        return (
            <Router history={history}>
                <Switch>
                    <Route exact path="/login" component={CognitoAuth}/>
                    <Route path="/calls" component={Calls}/>
                    <Route exact path="/" component={CognitoAuth}/>
                    <Route path="/upload" component={Upload} />
                    <Redirect from="/*" exact to="/calls" />
                </Switch>
            </Router>
        )
    }
}

export default withStyles(globalStyles)(App);