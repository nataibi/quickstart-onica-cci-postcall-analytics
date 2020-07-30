import {ApiService} from "./api.service";
import AuthDto from "../dto/auth.dto";
import {Auth} from 'aws-amplify';

class AuthService {

    private apiService: ApiService;

    constructor(apiService: ApiService) {
        this.apiService = apiService;
    }

    logout() {
        Auth.signOut();
    }

}

export default AuthService;