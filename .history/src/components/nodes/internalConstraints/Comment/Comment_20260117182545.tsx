const Comment = (props: any) => {
  const { data } = props;
  return (
    <Wrapper {...props} Default_Content="C" Node_Name="comment">
      <div className={styles.label}>{data.comment}</div>
    </Wrapper>
  );
};

export default Comment;