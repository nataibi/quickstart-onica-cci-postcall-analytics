import {AuthActionKey} from "../actions/auth.actions";
import {Reducer} from "redux";

const initialState = {
    loading: false,
    loginError: null,
    isAuthenticated: false,

    // indicate if change password is requested by cognito.
    changePassword: false,
    user: {
        email: "",
        roles: []
    }
};

const reducer: Reducer = (state = initialState, action: any): object => {
    switch (action.type) {
        case AuthActionKey.LOGIN_PENDING:
            return {
                ...state,
                loading: action.value
            };
        case AuthActionKey.LOGIN_ERROR:
            let changePassword = state.changePassword || false;
            let result = action.value.error;

            // once the changePassword is set, we keep it on until the user is successful...
            if (!changePassword && result) {
                changePassword = result.error._error.name === "NewPasswordRequired";
            }

            return {
                ...state,
                changePassword: changePassword,
                loginError: result
            };
        case AuthActionKey.LOGIN:
            return {
                ...state,
                isAuthenticated: true,
                changePassword: false,
                user: action.value.user
            };
        case AuthActionKey.LOGOUT:
            return {
                ...state,
                changePassword: false,
                isAuthenticated: false,
                user: null
            };
        default: {
            return state;
        }
    }
};

export default reducer;