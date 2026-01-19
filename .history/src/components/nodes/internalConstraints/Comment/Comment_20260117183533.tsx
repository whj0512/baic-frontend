import NodeWrapper from '../../common/NodeWrapper';
import './Comment.css'

const Comment = (props: any) => {
  const { data } = props;
  return (
    <NodeWrapper {...props} Default_Content="C" Node_Name="comment">
      <div className="label">{data.comment}</div>
    </NodeWrapper>
  );
};

export default Comment;