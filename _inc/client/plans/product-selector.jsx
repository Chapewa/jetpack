/**
 * External dependencies
 */
import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import { translate as __ } from 'i18n-calypso';
import { get } from 'lodash';

/**
 * Internal dependencies
 */
import QuerySiteProducts from 'components/data/query-site-products';
import { getPlanClass } from 'lib/plans/constants';
import { getProductsForPurchase, getSiteRawUrl, isMultisite } from 'state/initial-state';
import {
	getActiveSitePurchases,
	getAvailablePlans,
	getSitePlan,
	getActiveSearchPurchase,
	isFetchingSiteData,
} from 'state/site';
import { isFetchingSiteProducts, getSiteProducts } from 'state/site-products';
import { getPlanDuration } from 'state/plans/reducer';
import PurchasedProductCard from './single-product-components/purchased-product-card';
import SingleProductBackup from './single-product-backup';
import SingleProductSearch from './single-product-search';
import SingleProductCard from './single-product';
import './single-products.scss';
import DurationSwitcher from './duration-switcher';

class ProductSelector extends Component {
	state = {
		selectedBackupType: 'real-time',
		selectedProduct: {},
	};

	findPrioritizedPurchaseForBackup() {
		// TODO: Consider rolling this into a selector in state/site
		// Note: the order here is important, as it resolves cases where a site
		// has both a plan and a product at the same time.
		const planClasses = [
			'is-business-plan',
			'is-realtime-backup-plan',
			'is-premium-plan',
			'is-personal-plan',
			'is-daily-backup-plan',
		];

		for ( const planClass of planClasses ) {
			const purchase = this.props.activeSitePurchases.find(
				item => getPlanClass( item.product_slug ) === planClass
			);
			if ( undefined !== purchase ) {
				return purchase;
			}
		}

		return false;
	}

	setSelectedBackupType = selectedBackupType => {
		this.setState( { selectedBackupType } );
	};

	setSelectedProduct = ( key, type ) => {
		const selectedProduct = this.state.selectedProduct;
		selectedProduct[ key ] = type;
		this.setState( { selectedProduct } );
	};

	renderTitleSection() {
		return (
			<Fragment>
				<h1 className="plans-section__header">{ __( 'Solutions' ) }</h1>
				<h2 className="plans-section__subheader">
					{ __( "Looking for specific features? We've got you covered." ) }
				</h2>
			</Fragment>
		);
	}

	renderBackupProduct() {
		// Jetpack Backup does not support Multisite yet.
		if ( this.props.multisite ) {
			return null;
		}

		const purchase = this.findPrioritizedPurchaseForBackup();
		if ( purchase ) {
			return <PurchasedProductCard purchase={ purchase } siteRawlUrl={ this.props.siteRawlUrl } />;
		}

		// Don't show the product card for paid plans.
		const planSlug = get( this.props.sitePlan, 'product_slug' );
		if ( ! this.props.isFetchingData && 'jetpack_free' !== planSlug ) {
			return null;
		}

		return (
			<SingleProductBackup
				isFetching={ this.props.isFetchingData }
				products={ this.props.siteProducts }
				selectedBackupType={ this.state.selectedBackupType }
				setSelectedBackupType={ this.setSelectedBackupType }
			/>
		);
	}

	renderSearchProduct() {
		return this.props.searchPurchase ? (
			<PurchasedProductCard
				purchase={ this.props.searchPurchase }
				siteRawlUrl={ this.props.siteRawlUrl }
			/>
		) : (
			<SingleProductSearch
				isFetching={ this.props.isFetchingData }
				searchPurchase={ this.props.searchPurchase }
				siteProducts={ this.props.siteProducts }
			/>
		);
	}

	getProduct( key ) {
		return this.props.productsForPurchase.find( product => product.key === key );
	}

	getSelectedType( key ) {
		const product = this.getProduct( key );
		return this.state.selectedProduct && this.state.selectedProduct[ key ]
			? this.state.selectedProduct[ key ]
			: product.defaultOption;
	}

	getProductOption( key, optionType ) {
		const product = this.getProduct( key );
		return product.options.find( option => option.type === optionType );
	}

	getOptionName( key, option ) {
		return option.name;
	}

	getOptionPurchaseLink( key, option ) {
		return option[ this.props.planDuration ] ? option[ this.props.planDuration ].upgradeUrl : null;
	}

	getSelectedUpgrade( key ) {
		const type = this.getSelectedType( key );
		const option = this.getProductOption( key, type );
		const name = this.getOptionName( key, option );
		const link = this.getOptionPurchaseLink( key, option );
		const currencyCode = option.currencyCode;
		const potentialSavings = option.monthly.fullPrice * 12 - option.yearly.fullPrice;
		return {
			link,
			name,
			type,
			currencyCode,
			potentialSavings,
		};
	}

	renderProductsForPurchase() {
		const { isFetchingData, productsForPurchase, planDuration } = this.props;

		return (
			<div className="plan-section__single-products">
				{ productsForPurchase.map( function( product ) {
					return (
						<SingleProductCard
							product={ product }
							key={ product.key }
							isFetching={ isFetchingData }
							selectedUpgrade={ this.getSelectedUpgrade( product.key ) }
							planDuration={ planDuration }
							setSelectedProduct={ this.setSelectedProduct }
						/>
					);
				}, this ) }
			</div>
		);
	}

	render() {
		return (
			<div className="product-selector">
				<QuerySiteProducts />
				{ this.renderTitleSection() }
				<DurationSwitcher type="solutions" />
				<div className="plans-section__single-product plans-section__single-product--with-search">
					{ this.renderBackupProduct() }
					{ this.renderSearchProduct() }
				</div>
				{ this.renderProductsForPurchase() }
			</div>
		);
	}
}

export default connect( state => {
	return {
		activeSitePurchases: getActiveSitePurchases( state ),
		productsForPurchase: getProductsForPurchase( state ),
		isFetchingData:
			isFetchingSiteData( state ) ||
			! getAvailablePlans( state ) ||
			isFetchingSiteProducts( state ),
		planDuration: getPlanDuration( state ),
		multisite: isMultisite( state ),
		searchPurchase: getActiveSearchPurchase( state ),
		sitePlan: getSitePlan( state ),
		siteProducts: getSiteProducts( state ),
		siteRawlUrl: getSiteRawUrl( state ),
	};
} )( ProductSelector );
