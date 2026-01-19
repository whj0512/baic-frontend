import NodeWrapper from '../../common/NodeWrapper';
import './Comment.css'

const Comment = (props: any) => {
  return (
    <NodeWrapper {...props} Default_Content="C" Node_Name="comment">
      <div className="label">注释</div>
    </NodeWrapper>
  );
};

export default Comment;