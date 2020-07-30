import {SentimentActionKey} from "../actions/sentiment.action";
import {Reducer} from "redux";

const initialState = {
    loading: false,
    error: null,
    data: null,
    lastEvaluatedKey: null
};

const reducer: Reducer = (state = initialState, action: any): object => {
    switch (action.type) {
        case SentimentActionKey.GET_SENTIMENT_PENDING:
            return {
                ...state,
                data: null,
                error: null,
                loading: true
            };
        case SentimentActionKey.GET_SENTIMENT_ERROR:
            return {
                ...state,
                loading: false,
                error: action.payload
            };
        case SentimentActionKey.GET_SENTIMENT_SUCCESS:
            return {
                ...state,
                loading: false,
                error: null,
                data: JSON.parse(action.payload.uri)
            }
        default: {
            return state;
        }
    }
};

export default reducer;