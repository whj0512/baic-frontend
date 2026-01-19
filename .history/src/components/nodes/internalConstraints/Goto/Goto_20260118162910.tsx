interface GotoNodeProps {
    node?: Node;
}

const Goto: FC<GotoNodeProps> = ({ node }) => {
    const data = node?.getData() || {};
    const { nodeName = 'goto', stroke = '#333', fill = '#1e1e1e', fontFill = '#fff', fontSize = 12 } = data;

    return (
        <div className="goto-container">
            <div
                className="goto-shape"
            >
                <div
                    className="goto-inner"
                />
            </div>
            <span
                className="goto-label"
            >
                {nodeName}
            </span>
        </div>
    );
};

export default Goto;