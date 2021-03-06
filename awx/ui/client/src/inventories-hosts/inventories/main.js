/*************************************************
 * Copyright (c) 2015 Ansible, Inc.
 *
 * All Rights Reserved
 *************************************************/

import adhoc from './adhoc/main';
import group from './related/groups/main';
import sources from './related/sources/main';
import relatedHost from './related/hosts/main';
import inventoryCompletedJobs from './related/completed-jobs/main';
import inventoryList from './list/main';
import InventoryList from './inventory.list';
import adHocRoute from './adhoc/adhoc.route';
import insights from './insights/main';
import completedJobsRoute from './related/completed-jobs/completed-jobs.route';
import inventorySourceEditRoute from './related/sources/edit/sources-edit.route';
import inventorySourceEditNotificationsRoute from './related/sources/edit/sources-notifications.route';
import inventorySourceAddRoute from './related/sources/add/sources-add.route';
import inventorySourceListRoute from './related/sources/list/sources-list.route';
import inventorySourceListScheduleRoute from './related/sources/list/schedule/sources-schedule.route';
import inventorySourceListScheduleAddRoute from './related/sources/list/schedule/sources-schedule-add.route';
import inventorySourceListScheduleEditRoute from './related/sources/list/schedule/sources-schedule-edit.route';
import adhocCredentialRoute from './adhoc/adhoc-credential.route';
import inventoryGroupsList from './related/groups/list/groups-list.route';
import inventoryGroupsAdd from './related/groups/add/groups-add.route';
import inventoryGroupsEdit from './related/groups/edit/groups-edit.route';
import groupNestedGroupsRoute from './related/groups/related/nested-groups/group-nested-groups.route';
import hostNestedGroupsRoute from './related/hosts/related/nested-groups/host-nested-groups.route';
import nestedGroupsAdd from './related/groups/related/nested-groups/group-nested-groups-add.route';
import nestedHostsRoute from './related/groups/related/nested-hosts/group-nested-hosts.route';
import inventoryHosts from './related/hosts/related-host.route';
import smartInventoryHosts from './smart-inventory/smart-inventory-hosts.route';
import inventoriesList from './inventories.route';
import inventoryHostsAdd from './related/hosts/add/host-add.route';
import inventoryHostsEdit from './related/hosts/edit/standard-host-edit.route';
import smartInventoryHostsEdit from './related/hosts/edit/smart-host-edit.route';
import ansibleFactsRoute from '../shared/ansible-facts/ansible-facts.route';
import insightsRoute from './insights/insights.route';
import inventorySourcesCredentialRoute from './related/sources/lookup/sources-lookup-credential.route';
import inventorySourcesInventoryScriptRoute from './related/sources/lookup/sources-lookup-inventory-script.route';
import inventorySourcesProjectRoute from './related/sources/lookup/sources-lookup-project.route';
import SmartInventory from './smart-inventory/main';
import StandardInventory from './standard-inventory/main';
import hostNestedGroupsAssociateRoute from './related/hosts/related/nested-groups/host-nested-groups-associate.route';
import groupNestedGroupsAssociateRoute from './related/groups/related/nested-groups/group-nested-groups-associate.route';
import nestedHostsAssociateRoute from './related/groups/related/nested-hosts/group-nested-hosts-associate.route';
import nestedHostsAddRoute from './related/groups/related/nested-hosts/group-nested-hosts-add.route';

export default
angular.module('inventory', [
        adhoc.name,
        group.name,
        sources.name,
        relatedHost.name,
        inventoryCompletedJobs.name,
        inventoryList.name,
        insights.name,
        SmartInventory.name,
        StandardInventory.name,
    ])
    .factory('InventoryList', InventoryList)
    .config(['$stateProvider', 'stateDefinitionsProvider', '$stateExtenderProvider',
        function($stateProvider, stateDefinitionsProvider, $stateExtenderProvider) {
            let stateDefinitions = stateDefinitionsProvider.$get(),
            stateExtender = $stateExtenderProvider.$get();

            function generateInventoryStates() {

                let standardInventoryAdd = stateDefinitions.generateTree({
                    name: 'inventories.add', // top-most node in the generated tree (will replace this state definition)
                    url: '/inventory/add',
                    modes: ['add'],
                    form: 'InventoryForm',
                    controllers: {
                        add: 'InventoryAddController'
                    },
                    resolve: {
                        add: {
                            canAdd: ['rbacUiControlService', '$state', function(rbacUiControlService, $state) {
                                return rbacUiControlService.canAdd('inventory')
                                    .then(function(res) {
                                        return res.canAdd;
                                    })
                                    .catch(function() {
                                        $state.go('inventories');
                                    });
                            }]
                        }
                    }
                });

                let standardInventoryEdit = stateDefinitions.generateTree({
                    name: 'inventories.edit',
                    url: '/inventory/:inventory_id',
                    modes: ['edit'],
                    form: 'InventoryForm',
                    controllers: {
                        edit: 'InventoryEditController'
                    },
                    breadcrumbs: {
                        edit: '{{breadcrumb.inventory_name}}'
                    },
                    data: {
                        activityStream: true,
                        activityStreamTarget: 'inventory'
                    },
                    resolve: {
                        edit: {
                            smartInventoryRedirect: ['resourceData', '$state', '$stateParams',
                                function(resourceData, $state, $stateParams){
                                    if(resourceData.data.kind === "smart"){
                                        $state.go("inventories.editSmartInventory", {"smartinventory_id": $stateParams.inventory_id}, {reload: true});
                                    }
                            }],
                            InstanceGroupsData: ['$stateParams', 'Rest', 'GetBasePath', 'ProcessErrors',
                                function($stateParams, Rest, GetBasePath, ProcessErrors){
                                    let path = `${GetBasePath('inventory')}${$stateParams.inventory_id}/instance_groups/`;
                                    Rest.setUrl(path);
                                    return Rest.get()
                                        .then(({data}) => {
                                            if (data.results.length > 0) {
                                                 return data.results;
                                            }
                                        })
                                        .catch(({data, status}) => {
                                            ProcessErrors(null, data, status, null, {
                                                hdr: 'Error!',
                                                msg: 'Failed to get instance groups. GET returned ' +
                                                    'status: ' + status
                                            });
                                    });
                            }],
                            checkProjectPermission: ['resourceData', '$stateParams', 'Rest', 'GetBasePath', 'credentialTypesLookup',
                                function(resourceData, $stateParams, Rest, GetBasePath, credentialTypesLookup){
                                    if(_.has(resourceData, 'data.summary_fields.insights_credential')){
                                        return credentialTypesLookup()
                                            .then(kinds => {
                                                let insightsKind = kinds.Insights;
                                                let path = `${GetBasePath('projects')}?credential__credential_type=${insightsKind}&role_level=use_role`;
                                                Rest.setUrl(path);
                                                return Rest.get().then(({data}) => {
                                                    if (data.results.length > 0){
                                                        return true;
                                                    }
                                                    else {
                                                        return false;
                                                    }
                                                }).catch(() => {
                                                    return false;
                                                });
                                            });
                                    }
                                    else {
                                        return false;
                                    }
                            }],
                            checkInventoryPermission: ['resourceData', '$stateParams', 'Rest', 'GetBasePath',
                                function(resourceData, $stateParams, Rest, GetBasePath){
                                    if(_.has(resourceData, 'data.summary_fields.insights_credential')){
                                        let path = `${GetBasePath('inventory')}${$stateParams.inventory_id}/?role_level=use_role`;
                                            Rest.setUrl(path);
                                            return Rest.get().then(() => {
                                              return true;
                                            }).catch(() => {
                                              return false;
                                            });
                                    }
                                    else {
                                        return false;
                                    }
                            }],
                            CanRemediate: ['checkProjectPermission', 'checkInventoryPermission',
                                function(checkProjectPermission, checkInventoryPermission){
                                    // the user can remediate an insights
                                    // inv if the user has "use" permission on
                                    // an insights project and the inventory
                                    // being edited:
                                    return checkProjectPermission === true && checkInventoryPermission === true;
                            }]
                        },

                    }
                });

                let smartInventoryAdd = stateDefinitions.generateTree({
                    name: 'inventories.addSmartInventory', // top-most node in the generated tree (will replace this state definition)
                    url: '/smart/add?hostfilter',
                    modes: ['add'],
                    form: 'smartInventoryForm',
                    controllers: {
                        add: 'SmartInventoryAddController'
                    },
                    resolve: {
                        add: {
                            canAdd: ['rbacUiControlService', '$state', function(rbacUiControlService, $state) {
                                return rbacUiControlService.canAdd('inventory')
                                    .then(function(res) {
                                        return res.canAdd;
                                    })
                                    .catch(function() {
                                        $state.go('inventories');
                                    });
                            }]
                        }
                    }
                });

                let smartInventoryEdit = stateDefinitions.generateTree({
                    name: 'inventories.editSmartInventory',
                    url: '/smart/:smartinventory_id',
                    modes: ['edit'],
                    form: 'smartInventoryForm',
                    controllers: {
                        edit: 'SmartInventoryEditController'
                    },
                    breadcrumbs: {
                        edit: '{{breadcrumb.inventory_name}}'
                    },
                    data: {
                        activityStream: true,
                        activityStreamTarget: 'inventory',
                        activityStreamId: 'smartinventory_id'
                    },
                    resolve: {
                        edit: {
                            InstanceGroupsData: ['$stateParams', 'Rest', 'GetBasePath', 'ProcessErrors',
                                function($stateParams, Rest, GetBasePath, ProcessErrors){
                                    let path = `${GetBasePath('inventory')}${$stateParams.smartinventory_id}/instance_groups/`;
                                    Rest.setUrl(path);
                                    return Rest.get()
                                        .then(({data}) => {
                                            if (data.results.length > 0) {
                                                 return data.results;
                                            }
                                        })
                                        .catch(({data, status}) => {
                                            ProcessErrors(null, data, status, null, {
                                                hdr: 'Error!',
                                                msg: 'Failed to get instance groups. GET returned ' +
                                                    'status: ' + status
                                            });
                                    });
                                }]
                        }
                    }
                });

                let relatedHostsAnsibleFacts = _.cloneDeep(ansibleFactsRoute);
                relatedHostsAnsibleFacts.name = 'inventories.edit.hosts.edit.ansible_facts';

                let relatedHostsInsights = _.cloneDeep(insightsRoute);
                relatedHostsInsights.name = 'inventories.edit.hosts.edit.insights';

                let addSourceCredential = _.cloneDeep(inventorySourcesCredentialRoute);
                addSourceCredential.name = 'inventories.edit.inventory_sources.add.credential';
                addSourceCredential.url = '/credential';

                let addSourceInventoryScript = _.cloneDeep(inventorySourcesInventoryScriptRoute);
                addSourceInventoryScript.name = 'inventories.edit.inventory_sources.add.inventory_script';
                addSourceInventoryScript.url = '/inventory_script';

                let editSourceCredential = _.cloneDeep(inventorySourcesCredentialRoute);
                editSourceCredential.name = 'inventories.edit.inventory_sources.edit.credential';
                editSourceCredential.url = '/credential';

                let addSourceProject = _.cloneDeep(inventorySourcesProjectRoute);
                addSourceProject.name = 'inventories.edit.inventory_sources.add.project';
                addSourceProject.url = '/project';

                let editSourceProject = _.cloneDeep(inventorySourcesProjectRoute);
                editSourceProject.name = 'inventories.edit.inventory_sources.edit.project';
                editSourceProject.url = '/project';

                let editSourceInventoryScript = _.cloneDeep(inventorySourcesInventoryScriptRoute);
                editSourceInventoryScript.name = 'inventories.edit.inventory_sources.edit.inventory_script';
                editSourceInventoryScript.url = '/inventory_script';

                let inventoryCompletedJobsRoute = _.cloneDeep(completedJobsRoute);
                inventoryCompletedJobsRoute.name = 'inventories.edit.completed_jobs';

                let smartInventoryCompletedJobsRoute = _.cloneDeep(completedJobsRoute);
                smartInventoryCompletedJobsRoute.name = 'inventories.editSmartInventory.completed_jobs';

                let inventoryAdhocRoute = _.cloneDeep(adHocRoute);
                inventoryAdhocRoute.name = 'inventories.edit.adhoc';

                let smartInventoryAdhocRoute = _.cloneDeep(adHocRoute);
                smartInventoryAdhocRoute.name = 'inventories.editSmartInventory.adhoc';

                let inventoryAdhocCredential = _.cloneDeep(adhocCredentialRoute);
                inventoryAdhocCredential.name = 'inventories.edit.adhoc.credential';

                let smartInventoryAdhocCredential = _.cloneDeep(adhocCredentialRoute);
                smartInventoryAdhocCredential.name = 'inventories.editSmartInventory.adhoc.credential';

                return Promise.all([
                    standardInventoryAdd,
                    standardInventoryEdit,
                    smartInventoryAdd,
                    smartInventoryEdit
                ]).then((generated) => {
                    return {
                        states: _.reduce(generated, (result, definition) => {
                            return result.concat(definition.states);
                        }, [
                            stateExtender.buildDefinition(inventoriesList),
                            stateExtender.buildDefinition(inventoryAdhocRoute),
                            stateExtender.buildDefinition(smartInventoryAdhocRoute),
                            stateExtender.buildDefinition(inventoryAdhocCredential),
                            stateExtender.buildDefinition(smartInventoryAdhocCredential),
                            stateExtender.buildDefinition(inventorySourceListScheduleRoute),
                            stateExtender.buildDefinition(inventorySourceListScheduleAddRoute),
                            stateExtender.buildDefinition(inventorySourceListScheduleEditRoute),
                            stateExtender.buildDefinition(relatedHostsAnsibleFacts),
                            stateExtender.buildDefinition(relatedHostsInsights),
                            stateExtender.buildDefinition(inventoryGroupsList),
                            stateExtender.buildDefinition(inventoryGroupsAdd),
                            stateExtender.buildDefinition(inventoryGroupsEdit),
                            stateExtender.buildDefinition(groupNestedGroupsRoute),
                            stateExtender.buildDefinition(nestedHostsRoute),
                            stateExtender.buildDefinition(inventoryHosts),
                            stateExtender.buildDefinition(smartInventoryHosts),
                            stateExtender.buildDefinition(inventoryHostsAdd),
                            stateExtender.buildDefinition(inventoryHostsEdit),
                            stateExtender.buildDefinition(smartInventoryHostsEdit),
                            stateExtender.buildDefinition(hostNestedGroupsRoute),
                            stateExtender.buildDefinition(inventorySourceListRoute),
                            stateExtender.buildDefinition(inventorySourceAddRoute),
                            stateExtender.buildDefinition(inventorySourceEditRoute),
                            stateExtender.buildDefinition(inventorySourceEditNotificationsRoute),
                            stateExtender.buildDefinition(inventoryCompletedJobsRoute),
                            stateExtender.buildDefinition(smartInventoryCompletedJobsRoute),
                            stateExtender.buildDefinition(addSourceCredential),
                            stateExtender.buildDefinition(addSourceInventoryScript),
                            stateExtender.buildDefinition(editSourceCredential),
                            stateExtender.buildDefinition(editSourceInventoryScript),
                            stateExtender.buildDefinition(addSourceProject),
                            stateExtender.buildDefinition(editSourceProject),
                            stateExtender.buildDefinition(groupNestedGroupsAssociateRoute),
                            stateExtender.buildDefinition(hostNestedGroupsAssociateRoute),
                            stateExtender.buildDefinition(nestedHostsAssociateRoute),
                            stateExtender.buildDefinition(nestedGroupsAdd),
                            stateExtender.buildDefinition(nestedHostsAddRoute)
                        ])
                    };
                });

            }

            $stateProvider.state({
                name: 'inventories',
                url: '/inventories',
                lazyLoad: () => generateInventoryStates()
            });
        }
    ]);
