import NodeWrapper from '../NodeWrapper';
import './Comment.css'

const Comment = (props: any) => {
  const { node } = props;
  const data = node?.getData?.() || {};
  const commentText = data.comment || '';

  return (
    <NodeWrapper {...props} defaultContent="C" nodeName="comment" nodeType="comment">
      <div className="comment-content">{commentText}</div>
    </NodeWrapper>
  );
};

export default Comment;