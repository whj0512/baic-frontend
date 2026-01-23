import NodeWrapper from '../../common/NodeWrapper';
import './Comment.css'

const Comment = (props: any) => {
  const { data } = props;
  return (
    <NodeWrapper {...props} defaultContent="C" nodeName="comment" nodeType="comment">
        <div>{data}</div>
    </NodeWrapper>
  );
};

export default Comment;