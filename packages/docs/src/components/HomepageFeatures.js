import React from 'react';
import clsx from 'clsx';
import styles from './HomepageFeatures.module.css';

const FeatureList = [
  {
    title: 'Easy to Use',
    Svg: require('../../static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        <code>react-async-states</code> tries to facilitate subscriptions to states while supporting different
        polymorphic behaviors.
      </>
    ),
  },
  {
    title: 'Focus on What Matters',
    Svg: require('../../static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>
        Being able to summon a derived state anywhere in the application while having full control
        will help you reduce the time and overhead needed to manage state, and you will be able to focus
        on making the best of the user experience you can do.
      </>
    ),
  },
  {
    title: 'Different forms of states producers',
    Svg: require('../../static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        <code>react-async-states</code> allows you to produce state from different forms of functions: regular functions,
        async/await and promises. This allows to combine synchronous and asynchronous behavior.
      </>
    ),
  },
  {
    title: 'Automatic cleanup',
    Svg: require('../../static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        Automatically cancel asynchronous operations when the component unmounts or dependencies change, and prevent
        execution of old callbacks.
      </>
    ),
  },
  {
    title: 'Cancellations friendly',
    Svg: require('../../static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        Registering a cancellation <code>callback</code> is as easy as: <code>props.onAbort(callback)</code>.
      </>
    ),
  },
  {
    title: 'No dependencies and targets all react environments',
    Svg: require('../../static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        <code>react-async-states</code> has no dependencies and should target all React environments.
      </>
    ),
  },
];

function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} alt={title} />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
