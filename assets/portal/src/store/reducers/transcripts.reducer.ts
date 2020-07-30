import {TranscriptsActionKey} from "../actions/transcripts.actions";
import {Reducer} from "redux";

const initialState = {
    loading: false,
    error: null,
    data: [],
    lastEvaluatedKey: null
};

const reducer: Reducer = (state = initialState, action: any): object => {
    switch (action.type) {
        case TranscriptsActionKey.GET_TRANSCRIPTS_PENDING:
            return {
                ...state,
                error: null,
                loading: true
            };
        case TranscriptsActionKey.GET_TRANSCRIPTS_ERROR:
            return {
                ...state,
                loading: false,
                error: action.payload
            };
        case TranscriptsActionKey.GET_TRANSCRIPTS_SUCCESS:
            return {
                ...state,
                loading: false,
                error: null,
                data: action.payload.audio,
                lastEvaluatedKey: action.payload.lastEvaluatedKey,
                labels: action.payload.labels
            }
        default: {
            return state;
        }
    }
};

export default reducer;