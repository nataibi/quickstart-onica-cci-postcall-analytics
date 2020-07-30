import React, {Component} from 'react';
import {connect} from 'react-redux';
import {
    AppBar,
    Toolbar,
    IconButton, Grid,
    Typography, withStyles, createMuiTheme
} from "@material-ui/core";
import {Auth} from 'aws-amplify';

import {ExitToApp} from '@material-ui/icons';
import PropTypes from "prop-types";
import {AuthAction} from "../store/actions/auth.actions";
import AuthRoles from "../auth/AuthRoles";
import {MuiThemeProvider} from "@material-ui/core";
import themeColors from "../theme/colors";
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import {ApiService} from "../service/api.service"
import * as AWSGlobal from 'aws-sdk/global';
import AWS from 'aws-sdk';



const apiService = new ApiService()
let region = process.env.REACT_APP_COGNITO_DOMAIN.split('.')[2]

const styles = (theme) => ({
    root: {
        flexGrow: 1
    },
    logo: {
        margin: "5px 10px 0 0",
        height: 43
    },
    grow: {
        flexGrow: 1
    },
    userInfo: {
        marginRight: 10
    },
    role: {
        fontSize: 12,
        textAlign: "right",
        fontWeight: "bold",
        margin: "4px 0 -2px 0",
        paddingTop: 3
    },
    email: {
        fontSize: 12,
        fontWeight: "light",
        textAlign: "right",
        margin: "-2px 0 0 0",
        padding: 0
    },
    clickable: {
        cursor: "pointer"
    }
});

const theme = new createMuiTheme({
    palette: {
        primary: {
            main: themeColors.navBar
        }
    }
});


class NavigationBar extends Component {

    handleOnLogout = () => {
        this.props.logout();
    };

    goToUpload = () => this.props.history.push("/upload");

    goToQuickSight = async () => {
        let thisUrlEncoded = encodeURIComponent("https://"+window.location.hostname);
        let quicksightUrlEncoded = encodeURIComponent(`https://${region}.quicksight.aws.amazon.com/`);
        AWS.config.region = region;

        const auth = await apiService.getAuth()

        let id_token = auth.idToken;
        let cognitoParams = {
            IdentityPoolId: process.env.REACT_APP_COGNITO_IDENTITY_POOL_ID,
            Logins: {}
        };

        cognitoParams.Logins[`cognito-idp.${region}.amazonaws.com/${process.env.REACT_APP_COGNITO_USER_POOL_ID}`] = id_token;

        AWS.config.credentials = new AWS.CognitoIdentityCredentials(cognitoParams);
            
        AWS.config.credentials.refresh(error => {
            if (error) {
                console.error(error);
            } else {console.log("successful") }
        });

        AWS.config.getCredentials(function () {
            let creds = {
                "sessionId":AWS.config.credentials.accessKeyId,
                "sessionKey":AWS.config.credentials.secretAccessKey,
                "sessionToken":AWS.config.credentials.sessionToken
            }

            let credsEncoded = encodeURIComponent(JSON.stringify(creds));

            let uri = "https://signin.aws.amazon.com/federation?Action=getSigninToken&SessionDuration=43200&Session="+credsEncoded;
    
            const options = {
                method: 'POST',
                headers: {
                    Authorization : auth.accessToken,
                },
                redirect: 'follow', 
                referrerPolicy: 'no-referrer',
                body: uri
            }
    
            fetch(`${process.env.REACT_APP_BASE_API}/auth`, options)
            .then(response => {
                return response.json();
            })
            .then(data => {
                let quickSightSSO = "https://signin.aws.amazon.com/federation?Action=login&Issuer="+thisUrlEncoded+"&Destination="+quicksightUrlEncoded+"&SigninToken="+data.SigninToken
            
                console.log("AWS Console Sign In URL: "+quickSightSSO);
                window.location = quickSightSSO;
            });
        })    
    }

    goHome = () => this.props.history.push("/calls")

    render() {
        let {classes} = this.props;
        return (
            <MuiThemeProvider theme={theme}>
                <div className={classes.root}>
                    <AppBar position="static">
                        <Toolbar>
                            <Grid container direction="row" justify="space-between" alignContent="center"
                                  alignItems="center">
                                <Grid item>
                                    <Grid container direction="row" alignItems="center" alignContent="center">

                                        <Grid item onClick={this.goHome} className={classes.clickable}>
                                            <Typography variant="h5">
                                                Call Analytics
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </Grid>
                                <Grid item>
                                    <Grid container direction="row" alignItems="center" alignContent="center">
                                        <Grid item onClick={this.goToQuickSight} className={classes.clickable}>
                                            <img alt="Amazon QuickSight Logo" className={classes.logo}
                                                 src={process.env.PUBLIC_URL + '/images/quicksight.png'}/>
                                        </Grid>
                                        <Grid item>
                                            <Typography variant="h5">
                                                QuickSight
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </Grid>
                                <Grid item>
                                    <Grid container direction="row">
                                        <Grid item className={classes.userInfo}>
                                            <Grid container direction="column" alignContent="center"
                                                  alignItems="flex-end">
                                                <Grid item><p className={classes.role}>{this.props.userRole}</p></Grid>
                                                <Grid item><p className={classes.email}>{this.props.userEmail}</p>
                                                </Grid>
                                            </Grid>
                                        </Grid>
                                        <Grid item>
                                            <Grid container direction="column" alignItems={"center"} onClick={this.goToUpload} className={classes.clickable}>
                                                <Grid item >
                                                    <IconButton style={{ padding: 0, paddingLeft: 12, paddingRight: 12 }} color="inherit">
                                                        <CloudUploadIcon />
                                                    </IconButton>
                                                </Grid>
                                                <Grid item><p className={classes.email}>Upload</p></Grid>
                                            </Grid>
                                        </Grid>
                                        <Grid item>
                                            <Grid container direction="row" alignItems={"center"}>
                                                <Grid item>
                                                    <IconButton color="inherit" onClick={this.handleOnLogout}>
                                                        <ExitToApp/>
                                                    </IconButton>
                                                </Grid>
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Toolbar>
                    </AppBar>
                </div>
            </MuiThemeProvider>
        );
    }
}

NavigationBar.propTypes = {
    logout: PropTypes.func,
    history: PropTypes.object,
    token: PropTypes.string,
    refreshToken: PropTypes.func,
    updateToken: PropTypes.func
};

const mapStateToProps = (state) => {
    let role = "";
    if (!state.auth.user) {
        return {
            userEmail: null,
            userRole: null
        }
    }

    let roles = state.auth.user["roles"] || [];
    if (roles.includes(AuthRoles.MANAGER)) {
        role = "Manager";
    }

    if (roles.includes(AuthRoles.ADMIN)) {
        role = "Administrator"
    }

    if (!role) {
        role = "Agent"
    }

    return {
        userEmail: state.auth.user["email"],
        userRole: role
    }
};

const mapDispatchToProps = (dispatch) => {
    return {
        logout: () => dispatch(AuthAction.logout()),
    }
};


export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(NavigationBar))