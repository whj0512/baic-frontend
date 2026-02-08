# DSL-JSON

Example1

- dsl:

  ```
  Graph GotoFromTest type request desc "GotoFromTest"
  Start START
  Goto GOTO friend_node:STATE0
  State STATE0
  Transition START2GOTO from:START to:GOTO
  ```

  

- 调用 dsl-to-rbg (json):

  ```json
  {
      "nodes": [
          {
              "id": "START",
              "desc": "START",
              "label": "Start",
              "name": "start",
              "type_name": "start",
              "render_config": {
                  "color": "#ffffff",
                  "visible": true,
                  "x": 100,
                  "y": 100,
                  "width": 160,
                  "height": 80
              },
              "is_init_node": true,
              "is_finish_node": false,
              "input_transitions": [],
              "ports": {
                  "items": [
                      {
                          "group": "bottom",
                          "id": "START_bottom_0"
                      }
                  ]
              },
              "output_transitions": [
                  "START2GOTO"
              ],
              "time_props": null
          },
          {
              "id": "GOTO",
              "desc": "Goto",
              "label": "Goto",
              "name": "goto",
              "type_name": "goto",
              "render_config": {
                  "color": "#ffffff",
                  "visible": true,
                  "x": 300,
                  "y": 100,
                  "width": 160,
                  "height": 80
              },
              "is_init_node": false,
              "is_finish_node": false,
              "input_transitions": [
                  "START2GOTO"
              ],
              "ports": {
                  "items": [
                      {
                          "group": "top",
                          "id": "GOTO_top_0"
                      }
                  ]
              },
              "output_transitions": [],
              "time_props": null,
              "friend": {
                  "id": "STATE0",
                  "name": "New State"
              }
          },
          {
              "id": "STATE0",
              "desc": "New State",
              "label": "State",
              "name": "state",
              "type_name": "state",
              "render_config": {
                  "color": "#ffffff",
                  "visible": true,
                  "x": 500,
                  "y": 100,
                  "width": 160,
                  "height": 80
              },
              "is_init_node": false,
              "is_finish_node": false,
              "input_transitions": [],
              "ports": {
                  "items": [
                      {
                          "group": "top",
                          "id": "STATE0_top_0"
                      },
                      {
                          "group": "bottom",
                          "id": "STATE0_bottom_0"
                      }
                  ]
              },
              "output_transitions": [],
              "time_props": null,
              "exit_action_list": [],
              "entry_action_list": [],
              "pre_think_time": 0,
              "post_think_time": 0,
              "during_action_list": [],
              "normal_test_action_list": [],
              "dynamic_test_action_list": []
          }
      ],
      "transitions": [
          {
              "id": "START2GOTO",
              "render_config": {
                  "color": "#000000",
                  "visible": true,
                  "x": 0,
                  "y": 0,
                  "width": 0,
                  "height": 0
              },
              "test_layer": {
                  "data": [],
                  "is_order": false,
                  "is_group": false
              },
              "test_coverage": {
                  "is_configured": false,
                  "coverage_config": {
                      "condition_coverage_config": false,
                      "point_coverage_config": false,
                      "coverage_type": "",
                      "condition_coverage_method": "",
                      "point_coverage_method": ""
                  }
              },
              "action_list": [],
              "loop_times": 0,
              "event_list": [],
              "vertices": [],
              "time_tolerance": {
                  "type": "",
                  "value": 0
              },
              "sourcePort": "START_bottom_0",
              "targetPort": "GOTO_top_0",
              "desc": "",
              "type_name": "transition",
              "condition": "",
              "source_node": "START",
              "source_port_name": "START_bottom_0",
              "target_node": "GOTO",
              "target_port_name": "GOTO_top_0"
          }
      ],
      "id": "GotoFromTest",
      "test_coverage": {
          "path_coverage": {
              "path_coverage_method": ""
          },
          "condition_points_coverage": {
              "condition_coverage_method": "",
              "point_coverage_method": "",
              "coverage_type": ""
          }
      },
      "h_function": null,
      "entry_action_list": [],
      "exit_action_list": [],
      "graph_type": "request",
      "breakpoints": [],
      "terminate_ref_graph": {},
      "pre_ref_graph": {},
      "silent": false,
      "desc": "GotoFromTest",
      "type_name": "graph"
  }
  ```

  



Example2:

- dsl:

  ```
  Graph MySystem type request desc "MySystem"
  Start S
  State A
  State B
  Goto G1 friend_node:B
  Transition T1 from:S to:A
  Transition T2 from:A to:B
  ```

  

- 调用 dsl-to-rbg (json):

  ```json
  {
      "nodes": [
          {
              "id": "S",
              "desc": "START",
              "label": "Start",
              "name": "start",
              "type_name": "start",
              "render_config": {
                  "color": "#ffffff",
                  "visible": true,
                  "x": 100,
                  "y": 100,
                  "width": 160,
                  "height": 80
              },
              "is_init_node": true,
              "is_finish_node": false,
              "input_transitions": [],
              "ports": {
                  "items": [
                      {
                          "group": "bottom",
                          "id": "S_bottom_0"
                      }
                  ]
              },
              "output_transitions": [
                  "T1"
              ],
              "time_props": null
          },
          {
              "id": "A",
              "desc": "New State",
              "label": "State",
              "name": "state",
              "type_name": "state",
              "render_config": {
                  "color": "#ffffff",
                  "visible": true,
                  "x": 300,
                  "y": 100,
                  "width": 160,
                  "height": 80
              },
              "is_init_node": false,
              "is_finish_node": false,
              "input_transitions": [
                  "T1"
              ],
              "ports": {
                  "items": [
                      {
                          "group": "top",
                          "id": "A_top_0"
                      },
                      {
                          "group": "bottom",
                          "id": "A_bottom_0"
                      }
                  ]
              },
              "output_transitions": [
                  "T2"
              ],
              "time_props": null,
              "exit_action_list": [],
              "entry_action_list": [],
              "pre_think_time": 0,
              "post_think_time": 0,
              "during_action_list": [],
              "normal_test_action_list": [],
              "dynamic_test_action_list": []
          },
          {
              "id": "B",
              "desc": "New State",
              "label": "State",
              "name": "state",
              "type_name": "state",
              "render_config": {
                  "color": "#ffffff",
                  "visible": true,
                  "x": 500,
                  "y": 100,
                  "width": 160,
                  "height": 80
              },
              "is_init_node": false,
              "is_finish_node": false,
              "input_transitions": [
                  "T2"
              ],
              "ports": {
                  "items": [
                      {
                          "group": "top",
                          "id": "B_top_0"
                      }
                  ]
              },
              "output_transitions": [],
              "time_props": null,
              "exit_action_list": [],
              "entry_action_list": [],
              "pre_think_time": 0,
              "post_think_time": 0,
              "during_action_list": [],
              "normal_test_action_list": [],
              "dynamic_test_action_list": []
          },
          {
              "id": "G1",
              "desc": "Goto",
              "label": "Goto",
              "name": "goto",
              "type_name": "goto",
              "render_config": {
                  "color": "#ffffff",
                  "visible": true,
                  "x": 700,
                  "y": 100,
                  "width": 160,
                  "height": 80
              },
              "is_init_node": false,
              "is_finish_node": false,
              "input_transitions": [],
              "ports": {
                  "items": [
                      {
                          "group": "top",
                          "id": "G1_top_0"
                      },
                      {
                          "group": "bottom",
                          "id": "G1_bottom_0"
                      }
                  ]
              },
              "output_transitions": [],
              "time_props": null,
              "friend": {
                  "id": "B",
                  "name": "New State"
              }
          }
      ],
      "transitions": [
          {
              "id": "T1",
              "render_config": {
                  "color": "#000000",
                  "visible": true,
                  "x": 0,
                  "y": 0,
                  "width": 0,
                  "height": 0
              },
              "test_layer": {
                  "data": [],
                  "is_order": false,
                  "is_group": false
              },
              "test_coverage": {
                  "is_configured": false,
                  "coverage_config": {
                      "condition_coverage_config": false,
                      "point_coverage_config": false,
                      "coverage_type": "",
                      "condition_coverage_method": "",
                      "point_coverage_method": ""
                  }
              },
              "action_list": [],
              "loop_times": 0,
              "event_list": [],
              "vertices": [],
              "time_tolerance": {
                  "type": "",
                  "value": 0
              },
              "sourcePort": "S_bottom_0",
              "targetPort": "A_top_0",
              "desc": "",
              "type_name": "transition",
              "condition": "",
              "source_node": "S",
              "source_port_name": "S_bottom_0",
              "target_node": "A",
              "target_port_name": "A_top_0"
          },
          {
              "id": "T2",
              "render_config": {
                  "color": "#000000",
                  "visible": true,
                  "x": 0,
                  "y": 0,
                  "width": 0,
                  "height": 0
              },
              "test_layer": {
                  "data": [],
                  "is_order": false,
                  "is_group": false
              },
              "test_coverage": {
                  "is_configured": false,
                  "coverage_config": {
                      "condition_coverage_config": false,
                      "point_coverage_config": false,
                      "coverage_type": "",
                      "condition_coverage_method": "",
                      "point_coverage_method": ""
                  }
              },
              "action_list": [],
              "loop_times": 0,
              "event_list": [],
              "vertices": [],
              "time_tolerance": {
                  "type": "",
                  "value": 0
              },
              "sourcePort": "A_bottom_0",
              "targetPort": "B_top_0",
              "desc": "",
              "type_name": "transition",
              "condition": "",
              "source_node": "A",
              "source_port_name": "A_bottom_0",
              "target_node": "B",
              "target_port_name": "B_top_0"
          }
      ],
      "id": "MySystem",
      "test_coverage": {
          "path_coverage": {
              "path_coverage_method": ""
          },
          "condition_points_coverage": {
              "condition_coverage_method": "",
              "point_coverage_method": "",
              "coverage_type": ""
          }
      },
      "h_function": null,
      "entry_action_list": [],
      "exit_action_list": [],
      "graph_type": "request",
      "breakpoints": [],
      "terminate_ref_graph": {},
      "pre_ref_graph": {},
      "silent": false,
      "desc": "MySystem",
      "type_name": "graph"
  }
  ```

  

Example3:

- dsl:

  ```
  Graph Simplified type request desc "Simplified"
  Start S
  State A
  State C
  Transition T1 from:S to:A
  Transition T2 from:A to:C
  ```

  

- 调用 dsl-to-rbg (json):

  ```json
  {
      "nodes": [
          {
              "id": "S",
              "desc": "START",
              "label": "Start",
              "name": "start",
              "type_name": "start",
              "render_config": {
                  "color": "#ffffff",
                  "visible": true,
                  "x": 100,
                  "y": 100,
                  "width": 160,
                  "height": 80
              },
              "is_init_node": true,
              "is_finish_node": false,
              "input_transitions": [],
              "ports": {
                  "items": [
                      {
                          "group": "bottom",
                          "id": "S_bottom_0"
                      }
                  ]
              },
              "output_transitions": [
                  "T1"
              ],
              "time_props": null
          },
          {
              "id": "A",
              "desc": "New State",
              "label": "State",
              "name": "state",
              "type_name": "state",
              "render_config": {
                  "color": "#ffffff",
                  "visible": true,
                  "x": 300,
                  "y": 100,
                  "width": 160,
                  "height": 80
              },
              "is_init_node": false,
              "is_finish_node": false,
              "input_transitions": [
                  "T1"
              ],
              "ports": {
                  "items": [
                      {
                          "group": "top",
                          "id": "A_top_0"
                      },
                      {
                          "group": "bottom",
                          "id": "A_bottom_0"
                      }
                  ]
              },
              "output_transitions": [
                  "T2"
              ],
              "time_props": null,
              "exit_action_list": [],
              "entry_action_list": [],
              "pre_think_time": 0,
              "post_think_time": 0,
              "during_action_list": [],
              "normal_test_action_list": [],
              "dynamic_test_action_list": []
          },
          {
              "id": "C",
              "desc": "New State",
              "label": "State",
              "name": "state",
              "type_name": "state",
              "render_config": {
                  "color": "#ffffff",
                  "visible": true,
                  "x": 500,
                  "y": 100,
                  "width": 160,
                  "height": 80
              },
              "is_init_node": false,
              "is_finish_node": false,
              "input_transitions": [
                  "T2"
              ],
              "ports": {
                  "items": [
                      {
                          "group": "top",
                          "id": "C_top_0"
                      }
                  ]
              },
              "output_transitions": [],
              "time_props": null,
              "exit_action_list": [],
              "entry_action_list": [],
              "pre_think_time": 0,
              "post_think_time": 0,
              "during_action_list": [],
              "normal_test_action_list": [],
              "dynamic_test_action_list": []
          }
      ],
      "transitions": [
          {
              "id": "T1",
              "render_config": {
                  "color": "#000000",
                  "visible": true,
                  "x": 0,
                  "y": 0,
                  "width": 0,
                  "height": 0
              },
              "test_layer": {
                  "data": [],
                  "is_order": false,
                  "is_group": false
              },
              "test_coverage": {
                  "is_configured": false,
                  "coverage_config": {
                      "condition_coverage_config": false,
                      "point_coverage_config": false,
                      "coverage_type": "",
                      "condition_coverage_method": "",
                      "point_coverage_method": ""
                  }
              },
              "action_list": [],
              "loop_times": 0,
              "event_list": [],
              "vertices": [],
              "time_tolerance": {
                  "type": "",
                  "value": 0
              },
              "sourcePort": "S_bottom_0",
              "targetPort": "A_top_0",
              "desc": "",
              "type_name": "transition",
              "condition": "",
              "source_node": "S",
              "source_port_name": "S_bottom_0",
              "target_node": "A",
              "target_port_name": "A_top_0"
          },
          {
              "id": "T2",
              "render_config": {
                  "color": "#000000",
                  "visible": true,
                  "x": 0,
                  "y": 0,
                  "width": 0,
                  "height": 0
              },
              "test_layer": {
                  "data": [],
                  "is_order": false,
                  "is_group": false
              },
              "test_coverage": {
                  "is_configured": false,
                  "coverage_config": {
                      "condition_coverage_config": false,
                      "point_coverage_config": false,
                      "coverage_type": "",
                      "condition_coverage_method": "",
                      "point_coverage_method": ""
                  }
              },
              "action_list": [],
              "loop_times": 0,
              "event_list": [],
              "vertices": [],
              "time_tolerance": {
                  "type": "",
                  "value": 0
              },
              "sourcePort": "A_bottom_0",
              "targetPort": "C_top_0",
              "desc": "",
              "type_name": "transition",
              "condition": "",
              "source_node": "A",
              "source_port_name": "A_bottom_0",
              "target_node": "C",
              "target_port_name": "C_top_0"
          }
      ],
      "id": "Simplified",
      "test_coverage": {
          "path_coverage": {
              "path_coverage_method": ""
          },
          "condition_points_coverage": {
              "condition_coverage_method": "",
              "point_coverage_method": "",
              "coverage_type": ""
          }
      },
      "h_function": null,
      "entry_action_list": [],
      "exit_action_list": [],
      "graph_type": "request",
      "breakpoints": [],
      "terminate_ref_graph": {},
      "pre_ref_graph": {},
      "silent": false,
      "desc": "Simplified",
      "type_name": "graph"
  }
  ```

  



