/**
 * Copyright (c) 2015-present, Zippy Technologies
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import join from '../../common/join';
import raf from '../../common/raf';

const getClassNames = (props, state) => {
  const { className, orientation, position, visible, rootClassName } = props;
  const { animationClassName, actualVisibility } = state;

  return join(
    className,
    rootClassName,
    `${rootClassName}--${orientation}-orientation`,
    `${rootClassName}--${position}-position`,
    actualVisibility && `${rootClassName}--is-visible`,
    animationClassName
  );
};

const getProps = (props, state) => {
  const horizontal = props.orientation === 'horizontal';
  const { actualVisibility } = state;

  return {
    ...props,
    ...state,
    horizontal,
    visible: actualVisibility,
    className: getClassNames(props, state)
  };
};

const getPositioningStlyes = (config, { offsetWidth, offsetHeight }) => {
  const { horizontal } = config;
  let positioningStyles = {};
  if (horizontal) {
    positioningStyles.left = -offsetWidth / 2;
  } else {
    positioningStyles.top = -offsetHeight / 2;
  }

  return positioningStyles;
};

class SlideTooltip extends Component {
  constructor(props) {
    super(props);
    this.state = {
      positioningStyles: {},
      actualVisibility: props.visible
    };

    this.onTransitionEnd = this.onTransitionEnd.bind(this);
  }

  componentDidMount() {
    this.calculatePositionStyles();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.children !== this.p.children) {
      this.mustCalculatePositionStyles = true;
    }

    if (nextProps.visible !== this.p.visible) {
      const animationClassName = `${nextProps.rootClassName}--${
        nextProps.visible ? 'animate-in' : 'animate-out'
      }`;
      clearTimeout(this._animationSequenceStep);
      this._animationSequenceStep = setTimeout(() => {
        this.setState(
          {
            animationClassName: `${animationClassName}-start`
          },
          () => {
            raf(() => {
              this.setState({
                animationClassName: `${animationClassName} ${animationClassName}-end`,
                actualVisibility: nextProps.visible
              });
            });
          }
        );
      }, 250);
    }
  }

  onTransitionEnd() {
    if (this.p.animationClassName) {
      this.setState({
        animationClassName: null
      });
    }
  }

  componentDidUpdate() {
    if (this.mustCalculatePositionStyles) {
      this.mustCalculatePositionStyles = false;
      this.calculatePositionStyles();
    }
  }

  calculatePositionStyles() {
    const { offsetHeight, offsetWidth } = this.node;
    this.setState({
      positioningStyles: getPositioningStlyes(this.p, {
        offsetHeight,
        offsetWidth
      })
    });
  }

  render() {
    const {
      children,
      style,
      className,
      positioningStyles
    } = (this.p = getProps(this.props, this.state));

    return (
      <div
        onTransitionEnd={this.onTransitionEnd}
        style={{ ...style, ...positioningStyles }}
        ref={el => el && (this.node = el)}
        className={className}
      >
        {children}
      </div>
    );
  }
}

SlideTooltip.defaultProps = {
  orientation: 'horizontal',
  position: 'before',
  visible: false,
  rootClassName: 'zippy-react-toolkit-slider__tooltip'
};

SlideTooltip.propTypes = {
  orientation: PropTypes.oneOf(['horizontal', 'vertical']),
  position: PropTypes.oneOf(['before', 'after']),
  visible: PropTypes.bool,
  rootClassName: PropTypes.string
};

export default SlideTooltip;
