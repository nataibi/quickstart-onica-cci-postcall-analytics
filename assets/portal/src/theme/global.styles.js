const styles = (theme) => ({
    '@global': {
        body: {
            ...theme.typography.body1,
            margin: 0
        },
        h6: {
            color: theme.palette.primary.main,
            fontWeight: "normal"
        }
    }
});

export default styles;