import {Dispatch} from "redux"
import {ApiService} from "../../service/api.service"
const apiService = new ApiService()

const SentimentActionKey = {
    GET_SENTIMENT_PENDING: "GET_SENTIMENT_PENDING",
    GET_SENTIMENT_SUCCESS: "GET_SENTIMENT_SUCCESS",
    GET_SENTIMENT_ERROR: "GET_SENTIMENT_ERROR"
}

const SentimentAction = {
  getSentiment: (sentimentURI: string) => (dispatch: Dispatch) => {
    const uri = `${process.env.REACT_APP_BASE_API}/api/sentiment?uri=${encodeURIComponent(sentimentURI)}`
    dispatch({type: SentimentActionKey.GET_SENTIMENT_PENDING})
    apiService.getAuth()
    .then((token: any) => fetch(uri, {
      method: 'GET',
      headers: {
          Authorization: `${token.accessToken}`
      },
      redirect: 'follow', // manual, *follow, error
    }))
    .then((response: Response) => response.json())
    .then((response: any) => dispatch({
        type: SentimentActionKey.GET_SENTIMENT_SUCCESS,
        payload: response
    }))
    .catch((err: Error) => dispatch({
        type: SentimentActionKey.GET_SENTIMENT_ERROR,
        payload: err
    }))
  }
}

export {SentimentActionKey, SentimentAction}