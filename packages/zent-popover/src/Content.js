import React, { Component, PropTypes } from 'react';
import cx from 'zent-utils/classnames';
import Portal from 'zent-portal';
import WindowResizeHandler from 'zent-utils/lib/component/WindowResizeHandler';
import findPositionedParent from 'zent-utils/lib/dom/findPositionedParent';
import throttle from 'zent-utils/lodash/throttle';

import invisiblePlacement from './placement/invisible';

function translateToContainerCoordinates(containerBB, bb) {
  const { left, top } = containerBB;
  return {
    width: bb.width,
    height: bb.height,
    top: bb.top - top,
    left: bb.left - left,
    bottom: bb.bottom - top,
    right: bb.right - left
  };
}

/**
 * Like triggers, content can be replaced with your own implementation, all you have to do is extend this base class.
 *
 * The props on this class are all private.
 */
export default class PopoverContent extends Component {
  static propTypes = {
    children: PropTypes.node,

    prefix: PropTypes.string,

    id: PropTypes.string,

    getContentNode: PropTypes.func,

    visible: PropTypes.bool,

    // placement strategy
    placement: PropTypes.func,

    cushion: PropTypes.number,

    // A function that returns the anchor for this popover
    // () => Node
    getAnchor: PropTypes.func,

    // defaults to body
    containerSelector: PropTypes.string,
  };

  state = {
    position: null
  };

  getAnchor() {
    return this.props.getAnchor();
  }

  getPositionedParent() {
    // findPositionedParent returns null on fail
    if (this.positionedParent !== undefined) {
      return this.positionedParent;
    }

    const { containerSelector } = this.props;
    const container = document.querySelector(containerSelector);
    const parent = findPositionedParent(container, true);
    this.positionedParent = parent;
    return parent;
  }

  adjustPosition = () => {
    const content = this.props.getContentNode();

    // 可能还未渲染出来，先放到一个不可见的位置
    if (!content) {
      this.setState({
        position: invisiblePlacement(this.props.prefix)
      });
      setTimeout(this.adjustPosition, 0);

      return;
    }

    const anchor = this.getAnchor();
    const boundingBox = anchor.getBoundingClientRect();

    const parent = this.getPositionedParent();
    const parentBoundingBox = parent.getBoundingClientRect();

    const contentBoundingBox = content.getBoundingClientRect();

    const relativeBB = translateToContainerCoordinates(parentBoundingBox, boundingBox);
    const relativeContainerBB = translateToContainerCoordinates(parentBoundingBox, parentBoundingBox);
    const position = this.props.placement(this.props.prefix, relativeBB, relativeContainerBB, {
      width: contentBoundingBox.width,
      height: contentBoundingBox.height
    }, { cushion: this.props.cushion });

    this.setState({
      position
    });
  };

  onWindowResize = throttle((evt, delta) => {
    if (this.props.visible && (delta.deltaX !== 0 || delta.deltaY !== 0)) {
      this.adjustPosition();
    }
  }, 16);

  componentWillReceiveProps(nextProps) {
    if (nextProps.visible && nextProps.visible !== this.props.visible) {
      this.adjustPosition();
    }
  }

  render() {
    const { prefix, className, id, visible, children, containerSelector } = this.props;
    const { position } = this.state;

    if (!position) {
      return null;
    }

    const cls = cx(
      className,
      `${prefix}-popover`,
      id,

      position.toString()
    );

    return (
      <Portal visible={visible} selector={containerSelector} className={cls} css={position.getCSSStyle()}>
        <div className={`${prefix}-popover-content`}>
          {children}
          <WindowResizeHandler onResize={this.onWindowResize} />
        </div>
      </Portal>
    );
  }
}
