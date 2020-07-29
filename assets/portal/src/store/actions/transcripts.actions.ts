import {Dispatch} from "redux"
import {ApiService} from "../../service/api.service"
const apiService = new ApiService()

const TranscriptsActionKey = {
    GET_TRANSCRIPTS_PENDING: "GET_TRANSCRIPTS_PENDING",
    GET_TRANSCRIPTS_SUCCESS: "GET_TRANSCRIPTS_SUCCESS",
    GET_TRANSCRIPTS_ERROR: "GET_TRANSCRIPTS_ERROR"
}

const TranscriptsAction = {
    getTranscripts: (lastKey: string) => (dispatch: Dispatch) => {
        let uri = `${process.env.REACT_APP_BASE_API}/api/transcripts`
        if (lastKey) uri = `${uri}?lastKey=${encodeURIComponent(JSON.stringify(lastKey))}`
        dispatch({type: TranscriptsActionKey.GET_TRANSCRIPTS_PENDING})
        apiService.getAuth()
        .then((token: any) => fetch(uri, {
            method: 'GET',
            headers: {
                Authorization: `${token.accessToken}`
            },
            redirect: 'follow', // manual, *follow, error
            referrerPolicy: 'no-referrer', // no-referrer, *client
        }))
        .then((response: Response) => response.json())
        .then((response: any) => dispatch({
            type: TranscriptsActionKey.GET_TRANSCRIPTS_SUCCESS,
            payload: response
        }))
        .catch((err: Error) => dispatch({
            type: TranscriptsActionKey.GET_TRANSCRIPTS_ERROR,
            payload: err
        }))
    }
}

export {TranscriptsActionKey, TranscriptsAction}