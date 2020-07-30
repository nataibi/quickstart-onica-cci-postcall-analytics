import rp from 'request-promise';
import {Auth} from 'aws-amplify';
import AuthDto from "../dto/auth.dto";
import {PageInterface} from "../interface/page.interface";
import {CallInterface} from "../interface/call.interface";
import {AuthInterface} from "../interface/auth.interface";

const HttpMethod = {
    POST: "POST",
    GET: "GET",
    PATCH: "PATCH"
};

class ApiService {

    baseUrl = process.env.REACT_APP_BASE_API;

    getCalls(next: string | null): Promise<PageInterface<CallInterface>> {
        return this.request(HttpMethod.GET, `${this.baseUrl}/calls`, {
            next
        }, this.getAuth());
    }

    _getHeader(auth: AuthInterface | null): object {
        let header: any = {
        };
        if (auth) {
            header['Authorization'] = `Bearer ${auth.idToken}`;
        }
        console.log("The header", header);
        return header
    }

    getAuth(): Promise<AuthInterface | null> {
        return Auth.currentSession()
            .then(session => new AuthDto({
                idToken: session.getIdToken().getJwtToken(),
                accessToken: session.getAccessToken().getJwtToken(),
                refreshToken: session.getRefreshToken().getToken()
            }));
    }

    request(method: string, uri: string, body: object | null, auth: Promise<AuthInterface | null> = Promise.resolve(null)): Promise<any> {

        if (method === HttpMethod.POST) {
            return auth.then(auth => this._post(uri, body, auth));
        } else if (method === HttpMethod.GET) {
            return auth.then(auth => this._get(uri, body, auth));
        } else if (method === HttpMethod.PATCH) {
            return auth.then(auth => this._patch(uri, body, auth));
        } else {
            return Promise.resolve();
        }
    }

    _post(uri: string, body: object | null = {}, auth: AuthInterface | null = null) {
        let options = {method: HttpMethod.POST, uri, body, headers: this._getHeader(auth), json: true};
        return rp(options)
    }

    _get(uri: string, qs: object | null, auth: AuthInterface | null = null) {
        let options = {method: HttpMethod.GET, uri, qs, headers: this._getHeader(auth), json: true};
        return rp(options)
    }

    _patch(uri: string, body: object | null = {}, auth: AuthInterface | null = null) {
        let options = {method: HttpMethod.PATCH, uri, body, headers: this._getHeader(auth), json: true};
        return rp(options)
    }

}

export {ApiService};