interface GotoNodeProps {
    node?: Node;
}

const Goto: FC<GotoNodeProps> = ({ node }) => {
    const data = node?.getData() || {};
    const { nodeName = 'goto', stroke = '#333', fill = '#1e1e1e', fontFill = '#fff', fontSize = 12 } = data;

    return (
        <div style={styles.container}>
            <div
                style={{
                    ...styles.goto,
                    backgroundColor: stroke,
                }}
            >
                <div
                    style={{
                        ...styles.gotoInner,
                        backgroundColor: fill,
                    }}
                />
            </div>
            <span
                style={{
                    ...styles.label,
                    color: fontFill,
                    fontSize,
                }}
            >
                {nodeName}
            </span>
        </div>
    );
};

export default Goto;