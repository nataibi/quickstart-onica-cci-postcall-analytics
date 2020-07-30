import {AuthInterface} from "../interface/auth.interface";

class AuthDto {

    idToken: string;
    accessToken: string;
    refreshToken: string;

    constructor(auth: AuthInterface) {
        this.idToken = auth.idToken;
        this.accessToken = auth.accessToken;
        this.refreshToken = auth.refreshToken;
    }

}

export default AuthDto