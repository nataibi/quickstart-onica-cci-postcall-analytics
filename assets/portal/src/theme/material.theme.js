import {createMuiTheme} from "@material-ui/core";
import themeColors from "./colors";

const materialTheme = new createMuiTheme({
    spacing: 2,
    typography: {
        fontFamily: ["Roboto","Helvetica","Arial","sans-serif"].join(","),
    },
    colors: {
        mediumGray: themeColors.mediumGray,
        error: themeColors.error
    },
    palette: {
        primary: {
            main: themeColors.primary
        },
        secondary: {
            main: themeColors.turquoise
        },
        error: {
            main: themeColors.error
        }
    },
    boxShadow: {
        high: "3px 8px 20px -6px rgba(0,0,0,0.35)",
        medium: "2px 6px 10px -4px rgba(0,0,0,0.35)",
        low: "1px 4px 8px -3px rgba(0,0,0,0.35)"
    },
    overrides: {
        MuiTableCell: {
            stickyHeader: {
                backgroundColor: themeColors.primary
            },
            head: {
                color: "#FFFFFF"
            }
        },
        MuiTableSortLabel: {
            active: {
                color: "#FFFFFF !important"
            },
            icon: {
                color: "#FFFFFF !important"
            }
        }
    },
    infoCaption: {
        color: "#757575",
        fontSize: 12
    },
    modal: {
        root: {
            padding: 5
        },
        title: {
            fontSize: 25,
            padding: 0,
            margin: 0
        },
        paper: {
            padding: 20,
            width: 300
        },
        inputsContainer: {
            marginTop: 20
        },
        padTop: {
            marginTop: 20
        },
        error: {
            fontSize: 12,
            color: themeColors.error
        }
    }
});

export default materialTheme