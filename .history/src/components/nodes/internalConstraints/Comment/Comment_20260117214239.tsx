import NodeWrapper from '../../common/NodeWrapper';
import './Comment.css'

const Comment = (props: any) => {
  return (
    <NodeWrapper {...props} defaultContent="C" nodeName="comment" nodeType="comment">
        <div></div>
    </NodeWrapper>
  );
};

export default Comment;