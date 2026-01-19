import type { FC } from "react";

interface StartNodeProps {
    node?: Node;
}

const Start: FC<StartNodeProps> = (props) => {
    const data = node?.getData() || {};
    const { nodeName, fill = '#333', fontFill = '#fff', fontSize = 12 } = data;

    return (
        <div className="start-container">
            <div className="start-circle" style={{ backgroundColor: fill }} />
            {nodeName && (
                <span className="start-label" style={{ color: fontFill, fontSize }}>
                    {nodeName}
                </span>
            )}
        </div>
    );
}

export default Start;