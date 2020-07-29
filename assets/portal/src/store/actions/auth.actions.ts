import {ApiService} from "../../service/api.service";
import history from "../../history";
import AuthService from "../../service/auth.service";
import {Dispatch} from "redux";
import {UserInterface} from "../../interface/user.interface";
import {CognitoUser} from "amazon-cognito-identity-js";

const apiService = new ApiService();
const authService = new AuthService(apiService);

const AuthActionKey = {
    LOGIN_PENDING: "LOGIN_PENDING",
    LOGIN: "LOGIN",
    LOGOUT: "LOGOUT",
    LOGIN_ERROR: "LOGIN_ERROR"
};

const loginResults = (authenticated: boolean, user: UserInterface) => {
    return {
        type: AuthActionKey.LOGIN,
        value: {
            isAuthenticated: authenticated,
            user
        }
    }
};

const loginErrorResults = (error: any) => {
    return {
        type: AuthActionKey.LOGIN_ERROR,
        value: {
            error
        }
    }
};

const logoutResults = () => {
    return {
        type: AuthActionKey.LOGOUT
    }
};

const AuthAction = {
    auth: (user: CognitoUser) => {
        return (dispatch: Dispatch) => {
            let payload = user.getSignInUserSession()!.getIdToken().decodePayload();
            dispatch(loginResults(true, {
                email: payload['email'],
                roles: payload['cognito:groups']
            }));
        };
    },
    logout: () => {
        return (dispatch: Dispatch) => {
            authService.logout();
            // dispatch(logoutResults());
            // dispatch(loginErrorResults(null));
            // history.push('/login');
        }
    }
};

export {AuthActionKey, AuthAction}